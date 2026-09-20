"""WeRead connector — official Agent API (since 2026-05).

POST https://i.weread.qq.com/api/agent/gateway with `Authorization: Bearer
wrk-...` (key created by scanning the QR at https://weread.qq.com/r/weread-skills).
Body is FLAT: business params at the top level, never nested under `params`.

Data: /readdata/detail (mode=monthly + baseTime) returns readTimes — a
dict of day-ts → SECONDS for that month. baseTime accepts historical
period starts, so paging month by month recovers daily data for the
whole window. Verified live against the gateway (2026-09).

Probe the live API contract before the first sync:

    python -m app.connectors.weread --list-apis
"""

import argparse
import asyncio
import sys
from datetime import date, datetime, timedelta, timezone

import httpx

from ..config import settings
from ..models import DailyPoint

GATEWAY = "https://i.weread.qq.com/api/agent/gateway"
SKILL_VERSION = "1.0.4"
SHANGHAI = timezone(timedelta(hours=8))

API_READDATA = "/readdata/detail"
API_LIST = "/_list"


def _ts_to_date(ts) -> date:
    """Epoch timestamp → Shanghai date. Handles seconds or milliseconds."""
    try:
        ts = float(ts)
    except (TypeError, ValueError):
        raise ValueError(f"unparseable weread timestamp: {ts!r}")
    if ts > 10_000_000_000:  # milliseconds (JS convention)
        ts /= 1000
    return datetime.fromtimestamp(ts, tz=SHANGHAI).date()


class WereadConnector:
    name = "weread"
    label = "WeRead"
    default_days = 365

    async def _call(self, client: httpx.AsyncClient, api_name: str, **params) -> dict:
        body = {"api_name": api_name, "skill_version": SKILL_VERSION, **params}
        r = await client.post(
            GATEWAY,
            headers={"Authorization": f"Bearer {settings.weread_api_key}"},
            json=body,
        )
        if r.status_code in (401, 403):
            raise ValueError("WeRead key rejected — re-create it at weread.qq.com/r/weread-skills")
        r.raise_for_status()
        data = r.json()
        if data.get("errcode", 0) != 0:
            raise ValueError(f"weread errcode {data.get('errcode')}: {data.get('message', data)}")
        if "upgrade_info" in data:
            raise ValueError(
                "weread API upgrade required — re-visit weread.qq.com/r/weread-skills "
                "to refresh the key/skill version"
            )
        return data

    async def fetch(self, since: date, until: date) -> list[DailyPoint]:
        if not settings.weread_api_key:
            raise ValueError("WEREAD_API_KEY is not set — add it to apps/api/.env")

        # The official contract: mode=monthly + baseTime returns readTimes —
        # a dict of day-ts → seconds for that month. baseTime accepts
        # historical period starts, so paging month by month recovers DAILY
        # data for the whole requested window (verified live: the gateway
        # returns a dict, never a list).
        points: list[DailyPoint] = []
        async with httpx.AsyncClient(timeout=60) as client:
            month = date(since.year, since.month, 1)
            while month <= until:
                base_time = int(
                    datetime(month.year, month.month, 1, tzinfo=SHANGHAI).timestamp()
                )
                data = await self._call(
                    client, API_READDATA, mode="monthly", baseTime=base_time
                )
                daily = data.get("readTimes") or {}
                points.extend(self._points_from_daily(daily, since, until))
                # next month
                month = (
                    date(month.year + 1, 1, 1)
                    if month.month == 12
                    else date(month.year, month.month + 1, 1)
                )
        return points

    def _points_from_daily(
        self, daily: dict, since: date, until: date
    ) -> list[DailyPoint]:
        points: list[DailyPoint] = []
        for ts, seconds in sorted(daily.items()):
            d = _ts_to_date(ts)
            if not (since <= d <= until):
                continue
            minutes = round(float(seconds) / 60)
            if minutes <= 0:
                continue
            points.append(
                DailyPoint(
                    local_date=d,
                    domain="learning",
                    metric="learning.reading.minutes",
                    value=float(minutes),
                    unit="min",
                    source="weread",
                    confidence=0.9,
                    metadata={"granularity": "day", "seconds": float(seconds)},
                )
            )
        return points



async def _list_apis() -> None:
    if not settings.weread_api_key:
        print("WEREAD_API_KEY is not set — add it to apps/api/.env", file=sys.stderr)
        raise SystemExit(1)
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            GATEWAY,
            headers={"Authorization": f"Bearer {settings.weread_api_key}"},
            json={"api_name": API_LIST, "skill_version": SKILL_VERSION},
        )
        r.raise_for_status()
        print(r.text)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="WeRead connector utilities")
    parser.add_argument("--list-apis", action="store_true")
    args = parser.parse_args()
    if args.list_apis:
        asyncio.run(_list_apis())
    else:
        parser.print_help()
