"""TickTick / Dida connector — official Open API (OAuth2).

Region: cn → api.dida365.com + dida365.com/oauth · intl → ticktick.com.
Tokens live in .tokens.json (0600, gitignored), obtained once via
`python -m app.ticktick_auth`; this connector refreshes on 401.

Known seam: the official Open API has NO focus/pomodoro endpoint, so the
productivity metric is completed tasks/day (`productivity.focus.minutes`
stays reserved). The completed-task endpoint is only partially documented:
we try the from/to-windowed call first and fall back to a bare call with
client-side filtering.
"""

import json
import os
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import httpx

from ..config import settings
from ..models import DailyPoint

TOKENS_FILE = Path(".tokens.json")
SHANGHAI = timezone(timedelta(hours=8))


def _region() -> tuple[str, str, str]:
    """→ (api_base, oauth_host, label)"""
    if settings.ticktick_region == "cn":
        return "https://api.dida365.com/open/v1", "https://dida365.com", "cn"
    return "https://api.ticktick.com/open/v1", "https://ticktick.com", "intl"


def _load_tokens() -> dict:
    if TOKENS_FILE.exists():
        return json.loads(TOKENS_FILE.read_text())
    return {
        "access_token": settings.ticktick_access_token,
        "refresh_token": settings.ticktick_refresh_token,
    }


def _save_tokens(tokens: dict) -> None:
    TOKENS_FILE.write_text(json.dumps(tokens, indent=2))
    os.chmod(TOKENS_FILE, 0o600)


def _completed_date(completed_time: str) -> date:
    """Tolerant ISO parse: '+0800' → '+08:00', missing tz → assume Shanghai."""
    s = completed_time.strip()
    if s.endswith("+0800"):
        s = s[:-5] + "+08:00"
    try:
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=SHANGHAI)
        return dt.astimezone(SHANGHAI).date()
    except ValueError:
        return date.fromisoformat(s[:10])


class TicktickConnector:
    name = "ticktick"
    label = "TickTick"
    default_days = 90

    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {_load_tokens()['access_token']}"}

    async def _request(self, client: httpx.AsyncClient, method: str, url: str, **kw):
        tokens = _load_tokens()
        if not tokens.get("access_token"):
            raise ValueError("no TickTick token — run `npm run ticktick:auth` first")
        headers = {"Authorization": f"Bearer {tokens['access_token']}"}
        r = await client.request(method, url, headers=headers, **kw)
        if r.status_code == 401 and tokens.get("refresh_token"):
            refreshed = await self._refresh(client, tokens["refresh_token"])
            r = await client.request(
                method, url, headers={"Authorization": f"Bearer {refreshed}"}, **kw
            )
        return r

    async def _refresh(self, client: httpx.AsyncClient, refresh_token: str) -> str:
        api_base, oauth_host, _ = _region()
        r = await client.post(
            f"{oauth_host}/oauth/token",
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": settings.ticktick_client_id,
                "client_secret": settings.ticktick_client_secret,
            },
        )
        r.raise_for_status()
        tokens = r.json()
        _save_tokens(
            {
                "access_token": tokens["access_token"],
                "refresh_token": tokens.get("refresh_token", refresh_token),
            }
        )
        return tokens["access_token"]

    async def fetch(self, since: date, until: date) -> list[DailyPoint]:
        if not settings.ticktick_client_id:
            raise ValueError(
                "TICKTICK_CLIENT_ID is not set — create an app on the developer platform, then run `npm run ticktick:auth`"
            )

        api_base, _, _ = _region()
        per_day: dict[str, dict] = {}

        async with httpx.AsyncClient(timeout=60) as client:
            r = await self._request(client, "GET", f"{api_base}/project")
            r.raise_for_status()
            projects = r.json()

            for project in projects:
                pid = project.get("id")
                if not pid:
                    continue
                tasks = await self._completed_tasks(client, api_base, pid, since, until)
                for t in tasks:
                    completed = t.get("completedTime")
                    if not completed:
                        continue
                    d = _completed_date(completed)
                    if not (since <= d <= until):
                        continue
                    bucket = per_day.setdefault(d.isoformat(), {"tasks": 0, "projects": {}})
                    bucket["tasks"] += 1
                    name = project.get("name", pid)
                    bucket["projects"][name] = bucket["projects"].get(name, 0) + 1

        return [
            DailyPoint(
                local_date=date.fromisoformat(dk),
                domain="productivity",
                metric="productivity.tasks.completed",
                value=float(bucket["tasks"]),
                unit="tasks",
                source="ticktick",
                confidence=0.9,
                metadata={"by_project": bucket["projects"]},
            )
            for dk, bucket in sorted(per_day.items())
        ]

    async def _completed_tasks(
        self, client: httpx.AsyncClient, api_base: str, pid: str, since: date, until: date
    ) -> list[dict]:
        url = f"{api_base}/project/{pid}/task/completed"
        window = {
            "from": f"{since.isoformat()}T00:00:00+08:00",
            "to": f"{until.isoformat()}T23:59:59+08:00",
        }
        # Primary: windowed call (partially documented — probe on first live run)
        r = await self._request(client, "GET", url, params=window)
        if r.status_code in (200,):
            return r.json() if isinstance(r.json(), list) else []
        # Fallback: bare call + client-side filter
        r = await self._request(client, "GET", url)
        r.raise_for_status()
        return r.json() if isinstance(r.json(), list) else []
