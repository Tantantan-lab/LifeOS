"""Pipeline tests for TypeSafe insights — fake httpx client, no network, no DB.

The single seam is `app.typesafe.httpx.AsyncClient` (house style, same as
test_connectors.py); `insights.analytics.build_summary` and `insights.store`
are monkeypatched. Answers deliberately select the LAST option of every
candidate list, so a "defaults to options[0]" bug cannot pass.
"""

import asyncio

import pytest

import app.candidates as cand
import app.insights as insights
import app.typesafe as ts
from app.config import settings


def _run(coro):
    return asyncio.run(coro)


class FakeResponse:
    def __init__(self, status_code, payload=None, text=""):
        self.status_code = status_code
        self._payload = payload if payload is not None else {}
        self.text = text

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


def _patch(monkeypatch, responses):
    client = FakeClient(responses)
    monkeypatch.setattr(ts.httpx, "AsyncClient", lambda *a, **kw: client)
    return client


# ---------------------------------------------------------------- fixtures


def _summary():
    return {
        "generated_at": "2026-09-21",
        "period": {"kind": "week", "start": "2026-09-15", "end": "2026-09-21", "days": 7},
        "timezone": "Asia/Shanghai",
        "domains": [
            {
                "domain": "learning",
                "metric": "learning.study.minutes",
                "period_total": 480.0,
                "period_avg": 68.6,
                "prev_total": 420.0,
                "delta_pct": 14.3,
                "period90_total": 5400.0,
                "prev90_total": 4800.0,
                "delta90_pct": 12.4,
                "goal": {"mode": "day", "target": 120.0},
                "completion": 0.571,
                "data_state": "has_real_data",
            },
            {
                "domain": "coding",
                "metric": "coding.commits",
                "period_total": 6.0,
                "period_avg": 0.9,
                "prev_total": 12.0,
                "delta_pct": -50.0,
                "period90_total": 90.0,
                "prev90_total": 115.0,
                "delta90_pct": -22.0,
                "goal": {"mode": "week", "target": 10.0},
                "completion": 0.6,
                "data_state": "has_real_data",
            },
        ],
        "data_sources": [],
        "notable": [],
    }


def _no_data_summary():
    summary = _summary()
    for d in summary["domains"]:
        d.update(
            period_total=0.0, period_avg=0.0, prev_total=0.0, delta_pct=0.0,
            period90_total=0.0, prev90_total=0.0, delta90_pct=0.0,
            completion=0.0, data_state="no_data",
        )
    return summary


def _fixtures(monkeypatch, summary):
    monkeypatch.setattr(settings, "typesafe_api_key", "ts-test")

    async def fake_summary(start, end):
        return summary

    monkeypatch.setattr(insights.analytics, "build_summary", fake_summary)

    stored = {}

    async def fake_store(period, ps, pe, summary, content, meta, provider, model):
        stored.update(
            period=period, period_start=ps, period_end=pe, summary=summary,
            content=content, meta=meta, provider=provider, model=model,
        )

    monkeypatch.setattr(insights, "store", fake_store)
    return stored


def _ok_response(chosen, top_choice=None):
    """Answers select `chosen[field]` — callers pass the LAST candidate option."""
    answers = {
        field: {
            "type": "choice",
            "choice": sent,
            "probabilities": {sent: 0.87, "other option": 0.13},
            "confidence": 0.87,
        }
        for field, sent in chosen.items()
    }
    if top_choice:
        answers["top"] = {
            "type": "choice",
            "choice": top_choice,
            "probabilities": {top_choice: 0.64, "other domain": 0.36},
            "confidence": 0.64,
        }
    return {
        "model": "jev-1.13.0",
        "answers": answers,
        "usage": {"input_tokens": 500, "output_tokens": 20},
    }


def _last_options(summary):
    return {f: opts[-1] for f, opts in cand.build_candidates(summary).items() if opts}


def _last_options_zh(summary):
    return {f: opts[-1] for f, opts in cand.build_candidates_zh(summary).items() if opts}


# ---------------------------------------------------------------- happy path


def test_happy_path_maps_answers_verbatim(monkeypatch):
    summary = _summary()
    stored = _fixtures(monkeypatch, summary)
    sent = _last_options(summary)
    _patch(monkeypatch, [FakeResponse(200, _ok_response(sent, top_choice="coding"))])

    result = _run(insights.generate("week"))

    assert result["status"] == "ok"
    zh_sent = _last_options_zh(summary)
    for field in cand.FIELD_ORDER:
        assert stored["content"][field] == {"en": sent[field], "zh": zh_sent[field]}
    # the flattening regression test: web reads content.fact.{en,zh} directly
    assert set(stored["content"]) == {"fact", "trend", "gap", "action"}
    assert "validation" not in stored["content"]
    assert stored["provider"] == "typesafe"
    assert stored["model"] == "jev-1.13.0"
    assert stored["meta"]["model"] == "jev-1.13.0"
    assert stored["meta"]["usage"]["input_tokens"] == 500
    assert stored["meta"]["fields"]["fact"]["source"] == "selected"
    assert stored["meta"]["fields"]["fact"]["confidence"] == 0.87
    assert stored["meta"]["fields"]["fact"]["options"] == cand.build_candidates(summary)["fact"]
    # the header pick rides the same call and lands in meta.top
    assert stored["meta"]["top"]["choice"] == "coding"
    assert stored["meta"]["top"]["confidence"] == 0.64
    assert stored["meta"]["top"]["options"] == cand.build_top_options(summary)


def test_request_shape(monkeypatch):
    summary = _summary()
    _fixtures(monkeypatch, summary)
    sent = _last_options(summary)
    client = _patch(monkeypatch, [FakeResponse(200, _ok_response(sent))])

    _run(insights.generate("week"))

    method, url, kw = client.calls[0]
    assert method == "POST"
    assert url == "https://api.typesafe.ai/v1/systemone"
    assert kw["headers"]["Authorization"] == "Bearer ts-test"
    assert kw["json"]["model"] == settings.typesafe_model
    assert kw["json"]["state"] == summary
    assert set(kw["json"]["questions"]) == {"fact", "trend", "gap", "action", "top"}
    built = cand.build_candidates(summary)
    for field, question in kw["json"]["questions"].items():
        assert question["type"] == "choice"
        if field == "top":
            assert question["criteria"] == cand.build_top_options(summary)
            continue
        assert list(question["criteria"]) == built[field]
        assert all(v is None for v in question["criteria"].values())


# ---------------------------------------------------------------- skip / fallback paths


def test_no_candidates_skips_the_api_call(monkeypatch):
    summary = _no_data_summary()
    stored = _fixtures(monkeypatch, summary)
    client = _patch(monkeypatch, [])  # any call would raise AssertionError

    result = _run(insights.generate("week"))

    assert result["status"] == "ok"
    assert client.calls == []
    fixed = cand.build_fixed(summary)
    fixed_zh = cand.build_fixed_zh(summary)
    assert stored["content"] == {
        f: {"en": fixed[f], "zh": fixed_zh[f]} for f in cand.FIELD_ORDER
    }
    assert stored["model"] == "none"
    assert stored["meta"]["skipped"] == "no_candidates"


def test_dry_run_makes_no_call_and_no_write(monkeypatch):
    summary = _summary()
    stored = _fixtures(monkeypatch, summary)
    client = _patch(monkeypatch, [])

    result = _run(insights.generate("week", dry_run=True))

    assert result["status"] == "dry"
    assert result["questions"]
    assert result["candidates"]
    assert client.calls == []
    assert stored == {}


def test_missing_key_raises(monkeypatch):
    summary = _summary()
    stored = _fixtures(monkeypatch, summary)
    monkeypatch.setattr(settings, "typesafe_api_key", "")
    _patch(monkeypatch, [])

    with pytest.raises(ValueError, match="TYPESAFE_API_KEY"):
        _run(insights.generate("week"))
    assert stored == {}


# ---------------------------------------------------------------- retries and errors


def test_429_retries_then_succeeds(monkeypatch):
    summary = _summary()
    stored = _fixtures(monkeypatch, summary)
    sent = _last_options(summary)
    client = _patch(
        monkeypatch,
        [FakeResponse(429, text="slow down"), FakeResponse(200, _ok_response(sent))],
    )
    slept = []

    async def fake_sleep(seconds):
        slept.append(seconds)

    monkeypatch.setattr(ts, "_sleep", fake_sleep)

    _run(insights.generate("week"))

    assert len(client.calls) == 2
    assert slept == [1.0]
    assert stored["content"]["fact"] == {
        "en": sent["fact"],
        "zh": cand.build_candidates_zh(summary)["fact"][-1],
    }


def test_retries_exhausted_raises(monkeypatch):
    summary = _summary()
    stored = _fixtures(monkeypatch, summary)
    client = _patch(monkeypatch, [FakeResponse(529, text="overloaded")] * 3)
    slept = []

    async def fake_sleep(seconds):
        slept.append(seconds)

    monkeypatch.setattr(ts, "_sleep", fake_sleep)

    with pytest.raises(ts.TypeSafeUnavailableError):
        _run(insights.generate("week"))
    assert len(client.calls) == 3
    assert slept == [1.0, 2.0]
    assert stored == {}  # a failed generate writes nothing


def test_401_does_not_retry(monkeypatch):
    summary = _summary()
    stored = _fixtures(monkeypatch, summary)
    client = _patch(monkeypatch, [FakeResponse(401, text="bad key")])

    with pytest.raises(ts.TypeSafeAuthError):
        _run(insights.generate("week"))
    assert len(client.calls) == 1
    assert stored == {}


def test_422_does_not_retry(monkeypatch):
    summary = _summary()
    stored = _fixtures(monkeypatch, summary)
    client = _patch(monkeypatch, [FakeResponse(422, text='{"detail": "criteria"}')])

    with pytest.raises(ts.TypeSafeRequestError):
        _run(insights.generate("week"))
    assert len(client.calls) == 1
    assert stored == {}


# ---------------------------------------------------------------- defensive resolution


def test_unknown_answer_key_falls_back_to_first_option(monkeypatch):
    summary = _summary()
    stored = _fixtures(monkeypatch, summary)
    sent = _last_options(summary)
    sent["fact"] = "a sentence we did not send"
    _patch(monkeypatch, [FakeResponse(200, _ok_response(sent))])

    _run(insights.generate("week"))

    first_en = cand.build_candidates(summary)["fact"][0]
    first_zh = cand.build_candidates_zh(summary)["fact"][0]
    assert stored["content"]["fact"] == {"en": first_en, "zh": first_zh}
    assert stored["meta"]["fields"]["fact"]["source"] == "fallback"
    # untouched fields still map verbatim, both languages
    assert stored["content"]["trend"] == {
        "en": sent["trend"],
        "zh": cand.build_candidates_zh(summary)["trend"][-1],
    }


def test_missing_field_in_answers_falls_back(monkeypatch):
    summary = _summary()
    stored = _fixtures(monkeypatch, summary)
    sent = _last_options(summary)
    sent.pop("gap")
    _patch(monkeypatch, [FakeResponse(200, _ok_response(sent))])

    _run(insights.generate("week"))

    assert stored["content"]["gap"] == {
        "en": cand.build_candidates(summary)["gap"][0],
        "zh": cand.build_candidates_zh(summary)["gap"][0],
    }
    assert stored["meta"]["fields"]["gap"]["source"] == "fallback"


def test_banned_content_is_repaired(monkeypatch):
    summary = _summary()
    stored = _fixtures(monkeypatch, summary)
    built = cand.build_candidates(summary)
    bad = dict(built)
    bad["fact"] = ["This is a bad week."]
    monkeypatch.setattr(insights.candidates, "build_candidates", lambda s: bad)
    _patch(monkeypatch, [FakeResponse(200, _ok_response({"fact": "This is a bad week."}))])

    _run(insights.generate("week"))

    # a violating field swaps BOTH sides of the pair
    assert stored["content"]["fact"] == {
        "en": cand.build_fixed(summary)["fact"],
        "zh": cand.build_fixed_zh(summary)["fact"],
    }
    assert stored["meta"]["validation"]["banned_hits"] == ["fact: ['bad']"]
    assert stored["meta"]["validation"]["repaired"] == ["fact"]
