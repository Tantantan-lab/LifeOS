"""GitHub connector — fixture-driven, no network. The recorded JSON
mirrors the real /user/events PushEvent shape (distinct_size + commits)."""

import asyncio
from datetime import date

import pytest

from app.connectors.github import GithubConnector
from app.config import settings

FIXTURE = [
    {
        "type": "PushEvent",
        "created_at": "2026-09-18T14:30:00Z",  # 22:30 +08:00 → 2026-09-18
        "repo": {"name": "tantantan/lifeos"},
        "payload": {
            "distinct_size": 3,
            "size": 3,
            "commits": [
                {"distinct": True},
                {"distinct": True},
                {"distinct": False},
            ],
        },
    },
    {
        "type": "PushEvent",
        "created_at": "2026-09-17T17:30:00Z",  # 01:30 +08:00 next day → 2026-09-18? no: 17:30+8 = 01:30 on 09-18
        "repo": {"name": "tantantan/lifeos"},
        "payload": {"commits": [{"distinct": True}, {"distinct": True}]},
    },
    {
        "type": "WatchEvent",  # ignored
        "created_at": "2026-09-18T10:00:00Z",
        "repo": {"name": "other/repo"},
        "payload": {},
    },
    {
        "type": "PushEvent",
        "created_at": "2026-08-01T02:00:00Z",  # outside window → dropped
        "repo": {"name": "tantantan/lifeos"},
        "payload": {"distinct_size": 5},
    },
]


def _run(coro):
    return asyncio.run(coro)


def test_github_aggregation(monkeypatch):
    monkeypatch.setattr(settings, "github_token", "ghp_test")

    captured = {}

    class FakeResponse:
        def __init__(self, status_code, payload):
            self.status_code = status_code
            self._payload = payload

        def raise_for_status(self):
            if self.status_code >= 400:
                raise RuntimeError(f"http {self.status_code}")

        def json(self):
            return self._payload

    async def fake_get(self, url, params=None, headers=None):
        page = params["page"]
        # page 1 returns everything (2 in-window pushes), page 2 empty
        captured["url"] = url
        captured["per_page"] = params["per_page"]
        return FakeResponse(200, FIXTURE if page == 1 else [])

    import app.connectors.github as gh

    monkeypatch.setattr(gh.httpx.AsyncClient, "get", fake_get)

    points = _run(
        GithubConnector().fetch(
            since=date(2026, 9, 1), until=date(2026, 9, 18)
        )
    )

    assert captured["url"] == "https://api.github.com/user/events"
    assert captured["per_page"] == 100
    # Both pushes land on 2026-09-18 in +08:00 (the 09-17 17:30Z push is
    # 01:30 on 09-18 Shanghai time) → ONE day, 5 commits total.
    assert len(points) == 1

    by_day = {p.local_date.isoformat(): p for p in points}
    assert by_day["2026-09-18"].value == 5  # 3 distinct + 2 from second push
    assert by_day["2026-09-18"].domain == "coding"
    assert by_day["2026-09-18"].metric == "coding.commits"
    assert by_day["2026-09-18"].source == "github"
    assert "2026-09-17" not in by_day
    # Outside-window event dropped entirely
    assert all(p.local_date >= date(2026, 9, 1) for p in points)


def test_github_missing_token(monkeypatch):
    monkeypatch.setattr(settings, "github_token", "")
    with pytest.raises(ValueError, match="GITHUB_TOKEN"):
        _run(GithubConnector().fetch(date(2026, 9, 1), date(2026, 9, 18)))
