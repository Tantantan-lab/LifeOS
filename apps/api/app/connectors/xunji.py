"""Xunji (训记) connector — official training-data Open API.

Contract (verified from the official Skill doc, 2026-09):
  - read   POST https://trains.xunjiapp.cn/api_trains_for_llm_v2
           body {schema_version, datestr, include_full_data:false}
           records in res.trains (localid, title, start, end ms epoch,
           movements[{name, sets[{done, weight, unit, reps}]}])
  - key    Authorization: Bearer xjllm_… (also accepted as x-api-key)
  - limits same training-day reads are 15s apart — sync pages day by day
    with a small sleep and honors `too frequent` retry_after_ms

Mapping to LifeOS:
  - health.workout.session  one per training (3/week goal — the primary)
  - health.workout.minutes  from start/end duration when present
  - metadata carries {title, movements:[…], top_weight, cardio metrics}
"""

import asyncio
from datetime import date, timedelta

import httpx

from ..config import settings
from ..models import DailyPoint

BASE = "https://trains.xunjiapp.cn"

API_READ = "/api_trains_for_llm_v2"

SCHEMA = "train_open_api_v2"


class XunjiConnector:
    name = "xunji"
    label = "Xunji"
    default_days = 90

    async def _read_day(
        self, client: httpx.AsyncClient, datestr: str
    ) -> list[dict]:
        r = await client.post(
            BASE + API_READ,
            headers={"Authorization": f"Bearer {settings.xunji_token}"},
            json={
                "schema_version": SCHEMA,
                "datestr": datestr,
                "include_full_data": False,
            },
        )
        if r.status_code == 401:
            raise ValueError("Xunji key rejected — re-apply in the app")
        if r.status_code == 429 or "too frequent" in r.text:
            retry_after = 15
            try:
                retry_after = max(15, int(r.json().get("retry_after_ms", 15000)) // 1000)
            except Exception:  # noqa: BLE001
                pass
            await asyncio.sleep(retry_after)
            r = await client.post(
                BASE + API_READ,
                headers={"Authorization": f"Bearer {settings.xunji_token}"},
                json={
                    "schema_version": SCHEMA,
                    "datestr": datestr,
                    "include_full_data": False,
                },
            )
        r.raise_for_status()
        data = r.json()
        res = data.get("res") or {}
        trains = res.get("trains") or []
        if isinstance(res, list):
            trains = res
        return trains

    async def fetch(self, since: date, until: date) -> list[DailyPoint]:
        if not settings.xunji_token:
            raise ValueError("XUNJI_TOKEN is not set — add it to apps/api/.env")

        points: list[DailyPoint] = []
        async with httpx.AsyncClient(timeout=60) as client:
            day = since
            while day <= until:
                trains = await self._read_day(client, day.isoformat())
                for train in trains:
                    points.extend(self._points_for(train, day))
                day += timedelta(days=1)
                await asyncio.sleep(0.5)  # polite pacing; same-day reads need 15s
        return points

    def _points_for(self, train: dict, day: date) -> list[DailyPoint]:
        points: list[DailyPoint] = []
        title = train.get("title") or "Workout"
        movements = train.get("movements") or []
        names = [m.get("name") for m in movements if m.get("name")]

        meta: dict = {"title": title, "movements": names[:10]}
        duration_min: float | None = None

        # cardio summaries live on movement metrics
        for m in movements:
            metrics = m.get("metrics") or {}
            if metrics.get("kcal"):
                meta["kcal"] = float(metrics["kcal"])
                break

        # top weights per movement (sets carry weight+unit)
        top_weights = []
        for m in movements:
            best = None
            for s in m.get("sets") or []:
                if not s.get("done"):
                    continue
                w = s.get("weight") or s.get("weight_kg")
                if w:
                    try:
                        wv = float(str(w))
                    except (TypeError, ValueError):
                        continue
                    if best is None or wv > best:
                        best = wv
            if best is not None:
                top_weights.append({"name": m.get("name"), "weight": best})
        if top_weights:
            meta["top_weights"] = top_weights[:10]

        start = train.get("start")
        end = train.get("end")
        if start and end:
            duration_min = round((int(end) - int(start)) / 60000)

        points.append(
            DailyPoint(
                local_date=day,
                domain="health",
                metric="health.workout.session",
                value=1.0,
                unit="session",
                source="xunji",
                confidence=0.95,
                metadata=meta,
            )
        )
        if duration_min is not None and duration_min > 0:
            points.append(
                DailyPoint(
                    local_date=day,
                    domain="health",
                    metric="health.workout.minutes",
                    value=float(duration_min),
                    unit="min",
                    source="xunji",
                    confidence=0.95,
                    metadata={"title": title, "granularity": "day"},
                )
            )
        return points
