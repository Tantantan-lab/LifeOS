"""Maimemo (墨墨背单词) connector — official Open API (beta study endpoints).

Base: https://open.maimemo.com/open/api/v1 · Bearer token from the app
(墨墨 → 开放API; web-issued tokens expire in 7 days). Rate limits:
20/10s, 40/60s, 2000/5h — paginate slowly.

IMPORTANT approximation (no per-day history endpoint exists): each word
counts on the day of its MOST RECENT review (`last_study_date`). Today's
number prefers the authoritative `get_study_progress` value. Requires
auto-sync ON in the app.

401 → re-issue the token in the app.
"""

import asyncio
from datetime import date, datetime

import httpx

from ..config import settings
from ..models import DailyPoint

BASE = "https://open.maimemo.com/open/api/v1"


def _date_of_local(iso: str) -> date:
    # API returns Beijing-time strings like "2026-09-18T08:12:00.000+08:00";
    # the calendar date portion IS the local date — take it verbatim.
    return date.fromisoformat(iso[:10])


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
        return r.json()

    async def fetch(self, since: date, until: date) -> list[DailyPoint]:
        if not settings.maimemo_token:
            raise ValueError("MAIMEMO_TOKEN is not set — add it to apps/api/.env")

        per_day: dict[str, dict] = {}
        # get_study_progress is authoritative for TODAY and OVERRIDES the
        # history bucket (which also counts today's most-recent reviews).
        today_override: tuple[date, dict] | None = None

        async with httpx.AsyncClient(timeout=60) as client:
            try:
                progress = await self._post(client, "/study/get_study_progress", {})
                finished = (progress.get("progress") or {}).get("finished", 0)
                if finished:
                    # `until` is the connector's effective "today". Keeping
                    # the override inside the requested window also makes
                    # scheduled/replayed syncs deterministic across timezones.
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

            # History: sliding next_study_date window, bucketed by last_study_date.
            window_end = datetime(until.year, until.month, until.day, 23, 59, 59)
            cursor = window_end.strftime("%Y-%m-%dT%H:%M:%S.000+08:00")
            for _ in range(20):  # ≤20 pages (1000 × 20 words is beyond any vocab)
                body = {
                    "next_study_date": {"start": None, "end": cursor},
                    "limit": 1000,
                    "as_count": False,
                }
                data = await self._post(client, "/study/query_study_records", body)
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
