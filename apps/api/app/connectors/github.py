"""GitHub connector — official REST API, personal access token.

Known limitation (documented seam): /user/events covers ~30 days / max
300 events. Anything older stays mock history. A deeper backfill via
per-repo commits is an M4 candidate.
"""

from datetime import date, datetime, timedelta, timezone

import httpx

from ..config import settings
from ..models import DailyPoint

SHANGHAI = timezone(timedelta(hours=8))


class GithubConnector:
    name = "github"
    label = "GitHub"
    default_days = 30

    async def fetch(self, since: date, until: date) -> list[DailyPoint]:
        if not settings.github_token:
            raise ValueError("GITHUB_TOKEN is not set — add it to apps/api/.env")

        per_day: dict[str, dict] = {}  # dateKey → {commits, pushes, repos}
        headers = {
            "Authorization": f"Bearer {settings.github_token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

        async with httpx.AsyncClient(timeout=30) as client:
            for page in (1, 2, 3):  # 3 × 100 = 300, the API hard cap
                r = await client.get(
                    "https://api.github.com/user/events",
                    params={"per_page": 100, "page": page},
                    headers=headers,
                )
                if r.status_code == 401:
                    raise ValueError("GitHub token rejected (401) — check GITHUB_TOKEN")
                r.raise_for_status()
                events = r.json()
                if not events:
                    break
                for ev in events:
                    if ev.get("type") != "PushEvent":
                        continue
                    created = ev.get("created_at") or ""
                    if not created:
                        continue
                    local = datetime.fromisoformat(
                        created.replace("Z", "+00:00")
                    ).astimezone(SHANGHAI)
                    d = local.date()
                    if not (since <= d <= until):
                        continue
                    payload = ev.get("payload") or {}
                    n = payload.get("distinct_size")
                    if n is None:
                        commits = payload.get("commits") or []
                        n = sum(1 for c in commits if c.get("distinct"))
                        if n == 0:
                            n = payload.get("size") or len(commits)
                    if n <= 0:
                        continue
                    bucket = per_day.setdefault(
                        d.isoformat(), {"commits": 0, "pushes": 0, "repos": []}
                    )
                    bucket["commits"] += n
                    bucket["pushes"] += 1
                    repo = (ev.get("repo") or {}).get("name")
                    if repo and repo not in bucket["repos"]:
                        bucket["repos"].append(repo)

        return [
            DailyPoint(
                local_date=date.fromisoformat(dk),
                domain="coding",
                metric="coding.commits",
                value=float(bucket["commits"]),
                unit="commits",
                source="github",
                confidence=0.95,
                metadata={
                    "pushes": bucket["pushes"],
                    "repos": bucket["repos"][:5],
                },
            )
            for dk, bucket in sorted(per_day.items())
        ]
