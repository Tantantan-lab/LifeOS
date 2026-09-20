"""Fixture-driven tests for weread / maimemo / ticktick — no network.

The single seam is `module.httpx.AsyncClient`: every connector opens
`async with httpx.AsyncClient(...) as client` and calls client.get/post/
request. Tests replace the class with a FakeClient fed by a queue.
"""

import asyncio
from datetime import date

import pytest

from app.config import settings
from app.connectors.maimemo import MaimemoConnector
from app.connectors.ticktick import TicktickConnector, _completed_date
from app.connectors.weread import WereadConnector, _ts_to_date


def _run(coro):
    return asyncio.run(coro)


class FakeResponse:
    def __init__(self, status_code, payload=None, text=""):
        self.status_code = status_code
        self._payload = payload if payload is not None else {}
        self.text = text

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"http {self.status_code}")

    def json(self):
        return self._payload


class FakeClient:
    """Async context manager whose get/post/request pop from a queue."""

    def __init__(self, responses: list, *args, **kwargs):
        self.responses = list(responses)
        self.calls: list[tuple] = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False

    def _next(self, method, url, **kw):
        self.calls.append((method, url, kw))
        if not self.responses:
            raise AssertionError(f"no fixture response left for {method} {url}")
        return self.responses.pop(0)

    async def get(self, url, **kw):
        return self._next("GET", url, **kw)

    async def post(self, url, **kw):
        return self._next("POST", url, **kw)

    async def request(self, method, url, **kw):
        return self._next(method.upper(), url, **kw)


def _patch_client(module, monkeypatch, responses):
    client = FakeClient(responses)
    monkeypatch.setattr(module.httpx, "AsyncClient", lambda *a, **kw: client)
    return client


# ---------------------------------------------------------------- weread


def test_weread_ts_parsing():
    # milliseconds (JS convention)
    assert _ts_to_date(1_789_747_200_000) == date(2026, 9, 19)
    # seconds
    assert _ts_to_date(1_789_747_200) == date(2026, 9, 19)


def test_weread_daily_points(monkeypatch):
    monkeypatch.setattr(settings, "weread_api_key", "wrk-test")

    import app.connectors.weread as wr

    client = _patch_client(
        wr,
        monkeypatch,
        [
            FakeResponse(
                200,
                {
                    "errcode": 0,
                    # monthly + baseTime contract: day-ts → seconds
                    "readTimes": {
                        "1789747200": 2700,  # 45 min on 2026-09-19
                        "1789660800": 3600,  # 60 min on 2026-09-18
                    },
                },
            )
        ],
    )

    points = _run(WereadConnector().fetch(date(2026, 9, 1), date(2026, 9, 19)))
    method, url, kw = client.calls[0]
    assert url == "https://i.weread.qq.com/api/agent/gateway"
    assert kw["headers"]["Authorization"] == "Bearer wrk-test"
    assert kw["json"]["skill_version"] == "1.0.4"
    assert kw["json"]["mode"] == "monthly"
    # baseTime must be the Shanghai epoch of 2026-09-01 00:00 +08:00
    assert kw["json"]["baseTime"] == 1788192000
    assert "params" not in kw["json"]  # body must be flat

    by_day = {p.local_date.isoformat(): p for p in points}
    assert len(points) == 2
    assert by_day["2026-09-19"].value == 45
    assert by_day["2026-09-19"].metric == "learning.reading.minutes"
    assert by_day["2026-09-19"].source == "weread"
    assert by_day["2026-09-19"].metadata["granularity"] == "day"


def test_weread_errcode_raises(monkeypatch):
    monkeypatch.setattr(settings, "weread_api_key", "wrk-test")

    import app.connectors.weread as wr

    _patch_client(wr, monkeypatch, [FakeResponse(200, {"errcode": -1, "message": "boom"})])
    with pytest.raises(ValueError, match="errcode"):
        _run(WereadConnector().fetch(date(2026, 9, 1), date(2026, 9, 19)))


# ---------------------------------------------------------------- maimemo


def test_maimemo_bucketing(monkeypatch):
    monkeypatch.setattr(settings, "maimemo_token", "tok")

    import app.connectors.maimemo as mm

    client = _patch_client(
        mm,
        monkeypatch,
        [
            # 1) get_study_progress (today, authoritative)
            FakeResponse(
                200,
                {"progress": {"finished": 51, "total": 80, "study_time": 600000}},
            ),
            # 2) query_study_records page 1
            FakeResponse(
                200,
                {
                    "records": [
                        {"last_study_date": "2026-09-19T09:00:00.000+08:00"},
                        {"last_study_date": "2026-09-19T10:00:00.000+08:00"},
                        {"last_study_date": "2026-09-18T08:00:00.000+08:00"},
                        {"last_study_date": "2026-08-01T08:00:00.000+08:00"},
                    ],
                    "count": 4,
                },
            ),
            # 3) query_study_records page 2 — empty (stops pagination)
            FakeResponse(200, {"records": [], "count": 0}),
        ],
    )

    points = _run(MaimemoConnector().fetch(date(2026, 9, 1), date(2026, 9, 19)))
    by_day = {p.local_date.isoformat(): p for p in points}
    # 09-19: progress (51) overrides the bucket (2)
    assert by_day["2026-09-19"].value == 51
    assert by_day["2026-09-19"].metadata["method"] == "progress"
    assert by_day["2026-09-18"].value == 1
    assert "2026-08-01" not in by_day


# ---------------------------------------------------------------- ticktick


def test_ticktick_completed_date_parsing():
    assert _completed_date("2026-09-18T14:30:00.000+0800") == date(2026, 9, 18)
    assert _completed_date("2026-09-18T14:30:00+08:00") == date(2026, 9, 18)
    # 01:30 UTC = 09:30 +08:00 → still 2026-09-18
    assert _completed_date("2026-09-18T01:30:00+00:00") == date(2026, 9, 18)


def test_ticktick_aggregation(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "ticktick_client_id", "cid")
    monkeypatch.setattr(settings, "ticktick_client_secret", "csec")
    monkeypatch.setattr(settings, "ticktick_access_token", "at")

    import app.connectors.ticktick as tt

    monkeypatch.setattr(tt, "TOKENS_FILE", tmp_path / ".tokens.json")

    projects = [{"id": "p1", "name": "Work"}, {"id": "p2", "name": "Home"}]
    completed = [
        {"completedTime": "2026-09-18T10:00:00.000+0800"},
        {"completedTime": "2026-09-18T11:00:00.000+0800"},
        {"completedTime": "2026-09-17T09:00:00.000+0800"},
    ]
    client = _patch_client(
        tt,
        monkeypatch,
        [FakeResponse(200, projects), FakeResponse(200, completed), FakeResponse(200, completed)],
    )

    points = _run(TicktickConnector().fetch(date(2026, 9, 1), date(2026, 9, 18)))
    by_day = {p.local_date.isoformat(): p for p in points}
    # BOTH projects return the same completed list → 2× per day
    assert by_day["2026-09-18"].value == 4
    assert by_day["2026-09-18"].metric == "productivity.tasks.completed"
    assert by_day["2026-09-18"].metadata["by_project"] == {"Work": 2, "Home": 2}
    assert by_day["2026-09-17"].value == 2
