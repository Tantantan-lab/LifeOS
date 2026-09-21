"""Pure tests for candidate templates — no network, no DB, no clock.

The invariants: sentences are deterministic functions of the summary; every
number in every sentence is derivable from the summary with the real
formatters (Jev can never hallucinate a number because code rendered it);
templates carry zero banned words; no_data domains produce zero candidates
and mock_only sentences carry "(sample history)".
"""

import re
from collections import Counter
from copy import deepcopy

import app.candidates as cand
from app.insights import BANNED


def _d(**kw):
    base = dict(
        domain="learning",
        metric="learning.study.minutes",
        period_total=480.0,
        period_avg=68.6,
        prev_total=420.0,
        delta_pct=14.3,
        period90_total=5400.0,
        prev90_total=4800.0,
        delta90_pct=12.4,
        goal={"mode": "day", "target": 120.0},
        completion=0.571,
        data_state="has_real_data",
    )
    base.update(kw)
    return base


def _summary(domains, kind="week", days=7):
    return {
        "generated_at": "2026-09-21",
        "period": {"kind": kind, "start": "2026-09-15", "end": "2026-09-21", "days": days},
        "timezone": "Asia/Shanghai",
        "domains": domains,
        "data_sources": [],
        "notable": [],
    }


def _study(**kw):
    return _d(**kw)


def _reading(**kw):
    d = dict(
        domain="learning",
        metric="learning.reading.minutes",
        period_total=210.0,
        period_avg=30.0,
        prev_total=180.0,
        delta_pct=16.7,
        period90_total=2400.0,
        prev90_total=2200.0,
        delta90_pct=9.1,
        goal={"mode": "day", "target": 30.0},
        completion=1.0,
        data_state="has_real_data",
    )
    d.update(kw)
    return d


def _words(**kw):
    d = dict(
        domain="english",
        metric="english.words.reviewed",
        period_total=350.0,
        period_avg=50.0,
        prev_total=380.0,
        delta_pct=-7.9,
        period90_total=4200.0,
        prev90_total=3553.0,
        delta90_pct=18.2,
        goal={"mode": "day", "target": 40.0},
        completion=1.0,
        data_state="has_real_data",
    )
    d.update(kw)
    return d


def _commits(**kw):
    d = dict(
        domain="coding",
        metric="coding.commits",
        period_total=6.0,
        period_avg=0.9,
        prev_total=12.0,
        delta_pct=-50.0,
        period90_total=90.0,
        prev90_total=115.0,
        delta90_pct=-22.0,
        goal={"mode": "week", "target": 10.0},
        completion=0.6,
        data_state="has_real_data",
    )
    d.update(kw)
    return d


def _workouts(**kw):
    d = dict(
        domain="health",
        metric="health.workout.session",
        period_total=3.0,
        period_avg=0.4,
        prev_total=0.0,
        delta_pct=100.0,
        period90_total=12.0,
        prev90_total=0.0,
        delta90_pct=100.0,
        goal={"mode": "week", "target": 3.0},
        completion=1.0,
        data_state="has_real_data",
    )
    d.update(kw)
    return d


def _sleep(**kw):
    d = dict(
        domain="health",
        metric="health.sleep.minutes",
        period_total=2940.0,
        period_avg=420.0,
        prev_total=3080.0,
        delta_pct=-4.5,
        period90_total=90000.0,
        prev90_total=91837.0,
        delta90_pct=-2.0,
        goal={"mode": "band", "target": "390-450"},
        completion=1.0,
        data_state="mock_only",
    )
    d.update(kw)
    return d


def _tasks(**kw):
    d = dict(
        domain="productivity",
        metric="productivity.tasks.completed",
        period_total=0.0,
        period_avg=0.0,
        prev_total=0.0,
        delta_pct=0.0,
        period90_total=0.0,
        prev90_total=0.0,
        delta90_pct=0.0,
        goal={"mode": "week", "target": 15.0},
        completion=0.0,
        data_state="no_data",
    )
    d.update(kw)
    return d


SUMMARY = _summary(
    [
        _study(),
        _reading(),
        _words(),
        _commits(),
        _workouts(),
        _sleep(),
        _tasks(),
    ]
)

NO_DATA = _summary([_tasks(), _d(period_total=0.0, period_avg=0.0, prev_total=0.0,
                                 delta_pct=0.0, period90_total=0.0, prev90_total=0.0,
                                 delta90_pct=0.0, completion=0.0, data_state="no_data")])

ALL_ON_TARGET = _summary(
    [
        _study(completion=1.0),
        _reading(),
        _words(),
        _commits(completion=1.0),
        _workouts(),
        _sleep(),
        _tasks(),
    ]
)

SLEEP_LOW = _summary(
    [
        _study(),
        _reading(),
        _words(),
        _commits(),
        _workouts(),
        _sleep(period_total=2450.0, period_avg=350.0, completion=0.5),
        _tasks(),
    ]
)

SLEEP_HIGH = _summary(
    [
        _study(),
        _reading(),
        _words(),
        _commits(),
        _workouts(),
        _sleep(period_total=3500.0, period_avg=500.0, completion=0.5),
        _tasks(),
    ]
)

MONTH = _summary(
    [
        _study(
            period_total=1500.0, period_avg=50.0, prev_total=2000.0, delta_pct=-25.0,
            period90_total=45000.0, prev90_total=50000.0, delta90_pct=-10.0,
            completion=0.5,
        ),
        _commits(
            period_total=12.0, period_avg=0.4, prev_total=24.0, delta_pct=-50.0,
            period90_total=120.0, prev90_total=150.0, delta90_pct=-20.0,
            completion=0.5,
        ),
    ],
    kind="month",
    days=30,
)

# Every value a distinct number, no zero baselines — a hardcoded 7/30/100 in
# a template would pass SUMMARY but fail here.
CONTRAST = _summary(
    [
        _d(
            period_total=111.0, period_avg=15.9, prev_total=222.0, delta_pct=-50.0,
            period90_total=333.0, prev90_total=444.0, delta90_pct=-25.0,
            completion=0.7,
        ),
        _d(
            domain="coding", metric="coding.commits",
            period_total=555.0, period_avg=79.3, prev_total=666.0, delta_pct=-16.7,
            period90_total=777.0, prev90_total=888.0, delta90_pct=-12.4,
            goal={"mode": "week", "target": 10.0}, completion=0.5,
        ),
    ]
)

FIXTURES = (SUMMARY, NO_DATA, ALL_ON_TARGET, SLEEP_LOW, SLEEP_HIGH, MONTH, CONTRAST)


def _digit_tokens(text: str) -> set[str]:
    return set(re.findall(r"\d+(?:\.\d+)?", text))


def _legal_tokens(summary: dict) -> set[str]:
    """Every number a sentence may print, rebuilt from the summary with the
    real formatters: totals/avgs, signed pcts, goal percentages, shortfalls,
    goal targets (including band bounds), the fixed 90-day window, and the
    defined +100% zero-baseline case."""
    legal = {"90"}
    if any(
        d["prev90_total"] == 0 and d["period90_total"] > 0 for d in summary["domains"]
    ):
        legal.add("100")
    kind = summary["period"]["kind"]
    for d in summary["domains"]:
        for v in (
            d["period_total"],
            d["period_avg"],
            d["prev_total"],
            d["period90_total"],
            d["prev90_total"],
        ):
            legal |= _digit_tokens(cand.num(v))
        for v in (d["delta_pct"], d["delta90_pct"]):
            legal |= _digit_tokens(cand.pct(v))
        target = d["goal"]["target"]
        legal |= _digit_tokens(cand.num(target) if isinstance(target, (int, float)) else str(target))
        legal.add(str(cand.of_goal(d["completion"])))
        mode = d["goal"].get("mode")
        if mode == "day":
            legal.add(str(cand.whole(target - d["period_avg"])))
        elif mode == "week":
            if kind == "week":
                legal.add(str(cand.whole(target - d["period_total"])))
            else:
                legal.add(str(cand.whole(target - d["period_total"] / (summary["period"]["days"] / 7))))
    return legal


# ---------------------------------------------------------------- invariants


def test_candidates_are_deterministic():
    for summary in (SUMMARY, MONTH):
        assert cand.build_candidates(summary) == cand.build_candidates(deepcopy(summary))
        assert cand.build_candidates_zh(summary) == cand.build_candidates_zh(deepcopy(summary))
        assert cand.build_fixed(summary) == cand.build_fixed(deepcopy(summary))
        assert cand.build_fixed_zh(summary) == cand.build_fixed_zh(deepcopy(summary))


def test_every_number_is_derived_from_the_summary():
    for summary in (SUMMARY, CONTRAST):
        legal = _legal_tokens(summary)
        for field, sentences in cand.build_candidates(summary).items():
            for s in sentences:
                tokens = _digit_tokens(s)
                assert tokens <= legal, f"{field}: {s} has {tokens - legal}"
        for s in cand.build_fixed(summary).values():
            # fixed copy carries no data numbers — "90" is the window label
            # ("no 90-day direction"), matching the web's TREND section title
            assert _digit_tokens(s) <= {"90"}, s


def test_no_banned_words_in_templates():
    for summary in FIXTURES:
        for field, sentences in cand.build_candidates(summary).items():
            for s in sentences:
                assert not BANNED.findall(s), f"{field}: {s}"
        for s in cand.build_fixed(summary).values():
            assert not BANNED.findall(s)


def test_no_data_domains_are_excluded():
    for field, sentences in cand.build_candidates(SUMMARY).items():
        assert not any("Tasks completed" in s for s in sentences), field


def test_mock_only_sentences_carry_the_marker():
    for field, sentences in cand.build_candidates(SUMMARY).items():
        for s in sentences:
            if cand.SAMPLE_MARK in s:
                assert "Sleep" in s, f"{field}: {s}"
            else:
                assert "Sleep" not in s, f"{field}: {s}"


def test_gap_and_action_only_for_incomplete_goals():
    for field in ("gap", "action"):
        sentences = cand.build_candidates(SUMMARY)[field]
        assert sentences, field
        for s in sentences:
            assert any(label in s for label in ("Study time", "Commits")), f"{field}: {s}"


def test_sleep_band_wording():
    gap = cand.build_candidates(SLEEP_LOW)["gap"]
    action = cand.build_candidates(SLEEP_LOW)["action"]
    assert "Sleep: 350 min/night — below the 390-450 band (sample history)." in gap
    assert (
        "Sleep: aim inside the 390-450 min band — the last week averaged 350 min/night "
        "(sample history)." in action
    )
    assert "Sleep: 500 min/night — above the 390-450 band (sample history)." in (
        cand.build_candidates(SLEEP_HIGH)["gap"]
    )
    # in band → no GAP/ACTION for sleep at all
    for field in ("gap", "action"):
        assert not any("Sleep" in s for s in cand.build_candidates(SUMMARY)[field])


def test_zero_candidate_fields():
    built = cand.build_candidates(NO_DATA)
    for field in cand.FIELD_ORDER:
        assert built[field] == [], field
    assert cand.build_questions(built) == {}
    assert cand.build_fixed(NO_DATA) == cand.NO_DATA_FIXED
    for s in cand.build_fixed(NO_DATA).values():
        assert _digit_tokens(s) <= {"90"}, s


def test_partial_candidates():
    built = cand.build_candidates(ALL_ON_TARGET)
    assert built["gap"] == [] and built["action"] == []
    assert set(cand.build_questions(built)) == {"fact", "trend"}
    assert cand.build_fixed(ALL_ON_TARGET) == cand.ON_TARGET_FIXED


def test_choices_are_unique_and_capped():
    for summary in FIXTURES:
        for field, sentences in cand.build_candidates(summary).items():
            assert len(sentences) == len(set(sentences)), f"{field} has duplicates"
            assert len(sentences) <= cand.MAX_OPTIONS


def test_new_data_wording():
    fact = cand.build_candidates(SUMMARY)["fact"]
    trend = cand.build_candidates(SUMMARY)["trend"]
    assert "Workouts: 3 sessions this week — the previous week had none." in fact
    assert "Workouts over 90 days: +100% from a zero baseline." in trend


def test_month_period_wording():
    built = cand.build_candidates(MONTH)
    assert any("this month" in s for s in built["fact"])
    assert "Commits: average 7 more commits/week to reach the 10/week goal." in built["action"]
    # the weekly shortfall shape is a week-period shape only
    assert not any("short of the 10/week goal" in s for s in built["gap"])


# ---------------------------------------------------------------- zh twins


def test_zh_aligned_with_en():
    """en[i] and zh[i] always state the same fact: same count, and the exact
    same numbers with the same multiplicity (word order may differ — 中文
    语序不同 — so compare multisets, not sequences)."""
    for summary in (SUMMARY, MONTH, SLEEP_LOW, CONTRAST):
        en = cand.build_candidates(summary)
        zh = cand.build_candidates_zh(summary)
        for field in cand.FIELD_ORDER:
            assert len(en[field]) == len(zh[field]), field
            for e, z in zip(en[field], zh[field]):
                assert Counter(re.findall(r"\d+(?:\.\d+)?", e)) == Counter(
                    re.findall(r"\d+(?:\.\d+)?", z)
                ), f"{field}: {e!r} vs {z!r}"


def test_zh_numbers_derived_from_summary():
    for summary in (SUMMARY, CONTRAST):
        legal = _legal_tokens(summary)
        for field, sentences in cand.build_candidates_zh(summary).items():
            for s in sentences:
                assert _digit_tokens(s) <= legal, f"{field}: {s}"


def test_zh_no_banned_words():
    for summary in FIXTURES:
        for field, sentences in cand.build_candidates_zh(summary).items():
            for s in sentences:
                assert not cand.ZH_BANNED.findall(s), f"{field}: {s}"
        for s in cand.build_fixed_zh(summary).values():
            assert not cand.ZH_BANNED.findall(s)


def test_top_options():
    options = cand.build_top_options(SUMMARY)
    # productivity is no_data and drops out; health (sleep) is mock_only and
    # drops out too — the header never features a sample-history domain.
    assert set(options) == {"learning", "english", "coding"}
    assert all("(sample history)" not in s for s in options.values())
    legal = _legal_tokens(SUMMARY)
    for s in options.values():
        assert _digit_tokens(s) <= legal
    assert cand.build_top_options(NO_DATA) == {}


def test_zh_fixed_sets():
    assert cand.build_fixed_zh(NO_DATA) == cand.NO_DATA_FIXED_ZH
    assert cand.build_fixed_zh(ALL_ON_TARGET) == cand.ON_TARGET_FIXED_ZH
    for s in cand.build_fixed_zh(NO_DATA).values():
        assert _digit_tokens(s) <= {"90"}, s  # "90 天" is the window label
