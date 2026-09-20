"""Maimemo (墨墨背单词) connector — official Open API (beta study endpoints).

Contract verified LIVE against the official spec (open.maimemo.com/
api_bundle.yaml) and the gateway on 2026-09-20:
  - base   https://open.maimemo.com/open
  - paths  /api/v1/memo/study/get_study_progress
           /api/v1/memo/study/query_study_records
  - auth   Authorization: Bearer <app-issued API token>
  - envelope {"errors": [], "data": {...}, "success": true} — ALWAYS unwrap
    `data`; non-empty `errors` or success=false mean failure.
  - query_study_records body: {"next_study_date": {"end": ISO}}, limit ≤1000.
    DO NOT send start:null — the gateway rejects it with 400.

Token: App 我的 → 更多设置 → 实验功能 → 开放 API（7-day expiry; 401 → re-issue).
Beta caveats (official): requires 自动同步 ON in the app, and the app must
be opened the same day to initialize counters.

IMPORTANT approximation (no per-day history endpoint exists): each word
counts on the day of its MOST RECENT review (`last_study_date`). Today's
number prefers the authoritative get_study_progress value.
"""

import asyncio
from datetime import date, datetime, timedelta, timezone

import httpx

from ..config import settings
from ..models import DailyPoint

BASE = "https://open.maimemo.com/open"

API_PROGRESS = "/api/v1/memo/study/get_study_progress"
API_RECORDS = "/api/v1/memo/study/query_study_records"

SHANGHAI = timezone(timedelta(hours=8))

# Paging horizon: words studied today can have next_study_date months in
# the future — the window must reach far ahead or they are never returned.
PAGE_HORIZON_YEARS = 3


def _date_of_local(iso: str) -> date:
    """API timestamps are UTC ('...Z') or Beijing ('...+08:00'); the
    attributed day is ALWAYS the Shanghai calendar date."""
    s = iso.strip().replace("Z", "+00:00")
    dt = datetime.fromisoformat(s)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=SHANGHAI)
    return dt.astimezone(SHANGHAI).date()


class MaimemoConnector:
    name = "maimemo"
    label = "Maimemo"
    default_days = 365

    async def _post(self, client: httpx.AsyncClient, path: str, body: dict) -> dict:
        r = await client.post(
            BASE + path,
            headers={"Authorization": f"Bearer {settings.maimemo_token}"},
            json=body,
        )
        if r.status_code == 401:
            raise ValueError("Maimemo token rejected (401) — re-issue it in the app")
        r.raise_for_status()
        envelope = r.json()
        errors = envelope.get("errors") or []
        if errors or envelope.get("success") is False:
            raise ValueError(f"maimemo API error: {errors[:3]}")
        return envelope.get("data") or {}

    async def fetch(self, since: date, until: date) -> list[DailyPoint]:
        if not settings.maimemo_token:
            raise ValueError("MAIMEMO_TOKEN is not set — add it to apps/api/.env")

        per_day: dict[str, dict] = {}
        # get_study_progress is authoritative for TODAY and OVERRIDES the
        # history bucket (which also counts today's most-recent reviews).
        # `until` is the connector's effective "today", keeping scheduled
        # replays deterministic across timezones.
        today_override: tuple[date, dict] | None = None

        async with httpx.AsyncClient(timeout=60) as client:
            try:
                progress = await self._post(client, API_PROGRESS, {})
                finished = (progress.get("progress") or {}).get("finished", 0)
                if finished:
                    today_override = (
                        until,
                        {
                            "words": finished,
                            "target": (progress.get("progress") or {}).get("total"),
                            "method": "progress",
                        },
                    )
            except Exception:  # noqa: BLE001 — beta endpoint; pagination still works
                pass

            # History: sliding next_study_date window (end-only), bucketed by
            # last_study_date. The cursor starts YEARS ahead so words whose
            # next review is far in the future are still paged. Rate limits:
            # 20/10s, 40/60s, 2000/5h.
            horizon = datetime(until.year + PAGE_HORIZON_YEARS, 12, 31, 23, 59, 59)
            cursor = horizon.strftime("%Y-%m-%dT%H:%M:%S.000+08:00")
            for _ in range(50):  # ≤50 pages — covers ~50k words, beyond any vocab
                data = await self._post(
                    client,
                    API_RECORDS,
                    {"next_study_date": {"end": cursor}, "limit": 1000},
                )
                records = data.get("records") or []
                if not records:
                    break
                for rec in records:
                    last = rec.get("last_study_date")
                    if not last:
                        continue
                    d = _date_of_local(str(last))
                    if not (since <= d <= until):
                        continue
                    bucket = per_day.setdefault(
                        d.isoformat(), {"words": 0, "method": "last_study_date"}
                    )
                    bucket["words"] += 1
                oldest = min(
                    (r.get("next_study_date") or "" for r in records if r.get("next_study_date")),
                    default="",
                )
                if not oldest:
                    break
                if _date_of_local(oldest) < since:
                    break
                cursor = oldest
                await asyncio.sleep(0.5)  # rate limits

        if today_override is not None:
            per_day[today_override[0].isoformat()] = today_override[1]

        return [
            DailyPoint(
                local_date=date.fromisoformat(dk),
                domain="english",
                metric="english.words.reviewed",
                value=float(bucket["words"]),
                unit="words",
                source="maimemo",
                confidence=0.95,
                metadata={
                    "method": bucket["method"],
                    **({"target": bucket["target"]} if "target" in bucket else {}),
                },
            )
            for dk, bucket in sorted(per_day.items())
        ]
