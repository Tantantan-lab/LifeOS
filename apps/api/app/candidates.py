"""Candidate sentences — the only text Jev ever sees.

Pure functions of the analytics summary: same summary in, byte-identical
sentences out. Numbers are rendered here, so the sentence Jev picks IS the
final content — he selects an option, he never writes. No clock, no I/O,
no randomness (project rule: deterministic data layer).

Bilingual by construction: every shape emits an (en, zh) pair over the same
conditionals and the same numbers, so `en[i]` and `zh[i]` always state the
same fact. Jev chooses among the EN sentences; code maps the pick by index.
zh vocabulary mirrors apps/web/src/lib/i18n.ts (labels, units, 样例历史/暂无数据).
"""

import re

FIELD_ORDER = ("fact", "trend", "gap", "action")
SAMPLE_MARK = " (sample history)"
SAMPLE_MARK_ZH = "（样例历史）"
FLAT_DELTA = 3.0  # |delta| < 3 reads as steady — mirrors the web's trendOf(delta, epsilon=3)
MAX_OPTIONS = 32  # defensive only: today's max is 18 (7 metrics × 4 shapes); Choice limit is 255

# zh judgment words the templates must never carry ("还差" is neutral and not
# listed; the web renders 差距 as a section title, so 差 alone is too broad).
ZH_BANNED = re.compile(r"失败|糟糕|懒惰|懒散|落后|令人失望|借口|差劲|应该")

# metric → (label, unit, per) — labels mirror apps/web GOAL_ROWS vocabulary.
METRIC_META: dict[str, tuple[str, str, str]] = {
    "learning.study.minutes": ("Study time", "min", "day"),
    "learning.reading.minutes": ("Reading", "min", "day"),
    "english.words.reviewed": ("Vocabulary", "words", "day"),
    "coding.commits": ("Commits", "commits", "day"),
    "health.workout.session": ("Workouts", "sessions", "day"),
    "health.sleep.minutes": ("Sleep", "min", "night"),
    "productivity.tasks.completed": ("Tasks completed", "tasks", "day"),
}

# zh labels/units mirror the i18n dictionary (Study time→学习时长, Commits→提交,
# Workouts→训练, "Tasks completed"→完成任务); the label already carries the
# noun, so units are the lighter form (次/项 rather than 次提交/项任务).
METRIC_META_ZH: dict[str, tuple[str, str, str]] = {
    "learning.study.minutes": ("学习时长", "分钟", "天"),
    "learning.reading.minutes": ("阅读", "分钟", "天"),
    "english.words.reviewed": ("词汇", "词", "天"),
    "coding.commits": ("提交", "次", "天"),
    "health.workout.session": ("训练", "次", "天"),
    "health.sleep.minutes": ("睡眠", "分钟", "晚"),
    "productivity.tasks.completed": ("完成任务", "项", "天"),
}

INSTRUCTIONS: dict[str, str] = {
    "fact": (
        'One FACT sentence is shown to the user under "What the data says". '
        "Which single sentence most usefully states what this period's numbers actually show? "
        "Prefer the sentence that reports the comparison with the previous period when the "
        "change is real, and a plain total when it is not."
    ),
    "trend": (
        'One TREND sentence is shown under "Direction over 30/90 days". '
        "Which single sentence best describes the direction the user is moving over the last "
        "90 days? Prefer a sentence with a clear direction over a flat one, unless every "
        "option is flat."
    ),
    "gap": (
        'One GAP sentence is shown under "Distance to your own goals". '
        "Which single sentence best shows where the user stands furthest from a goal they set "
        "for themselves? Judge the distance to their own target only — never compare them with "
        "other people."
    ),
    "action": (
        'One ACTION sentence is shown under "One concrete next step". '
        "Which single step is most worth doing in the coming period? Prefer the step whose goal "
        "is closest to being reached."
    ),
}

SHARED_SUFFIX = (
    "Each option below is a finished sentence and its numbers are already correct. "
    "Select exactly one option — never edit, merge or extend it. Do not prefer an option "
    "because its number is larger. `period` and `domains` in the state carry the underlying "
    "totals, 90-day totals, goals and data_state; a trailing '(sample history)' is a "
    "provenance label, not a quality signal, so never avoid a sentence for carrying it."
)

NO_DATA_FIXED = {
    "fact": "No data yet — nothing logged in this period.",
    "trend": "No data yet — no 90-day direction to compare.",
    "gap": "No data yet — no goal progress to measure.",
    "action": "Log a session to start the record.",
}
ON_TARGET_FIXED = {
    "fact": "No data yet — nothing logged in this period.",  # unreachable: any data yields a FACT candidate
    "trend": "No data yet — no 90-day direction to compare.",  # unreachable, same reason
    "gap": "Every tracked goal is on target in this period.",
    "action": "Hold this rhythm — the goals are already met.",
}

NO_DATA_FIXED_ZH = {
    "fact": "暂无数据 —— 本期没有记录。",
    "trend": "暂无数据 —— 没有 90 天方向可比较。",
    "gap": "暂无数据 —— 没有目标进度可衡量。",
    "action": "先记录一次，开启数据。",
}
ON_TARGET_FIXED_ZH = {
    "fact": NO_DATA_FIXED_ZH["fact"],  # unreachable, same reason as en
    "trend": NO_DATA_FIXED_ZH["trend"],
    "gap": "本期所有已追踪目标均已达成。",
    "action": "保持当前节奏 —— 目标已达成。",
}


def num(v: float) -> str:
    """480.0 → "480" · 68.6 → "68.6" · 0.0 → "0"."""
    if v == int(v):
        return str(int(v))
    return f"{v:.1f}"


def pct(v: float) -> str:
    """14.3 → "+14%" · -50.0 → "-50%" · |v| < 0.5 → "+0%"."""
    if abs(v) < 0.5:
        return "+0%"
    return f"{v:+.0f}%"


def of_goal(completion: float) -> int:
    """0.571 → 57. Capped at 99 — GAP candidates only exist below a full goal,
    so a 0.995 must never print as 100%."""
    return min(99, round(completion * 100))


def whole(v: float) -> int:
    """51.4 → 51 (round-half-even); used for suggested numbers."""
    return round(v)


def _eligible(summary: dict) -> list[dict]:
    return [d for d in summary["domains"] if d["data_state"] != "no_data"]


def _mark(d: dict) -> str:
    return SAMPLE_MARK if d["data_state"] == "mock_only" else ""


def _band(d: dict) -> tuple[float, float] | None:
    """Parses goal.target "390-450" (str). The summary stays the single source
    for every number in the sentence — never import analytics.SLEEP_BAND."""
    target = d["goal"].get("target")
    if not isinstance(target, str):
        return None
    parts = target.split("-")
    if len(parts) != 2:
        return None
    try:
        return float(parts[0]), float(parts[1])
    except ValueError:
        return None


def _period_word(summary: dict) -> str:
    return summary["period"]["kind"]


def trend90_line(label: str, d: dict, mark: str = "") -> str:
    """The base 90-day trend sentence for a domain — shared by the TREND
    candidates and the header's top question (same numbers, same shapes)."""
    delta90 = d["delta90_pct"]
    if d["prev90_total"] == 0 and d["period90_total"] > 0:
        return f"{label} over 90 days: +100% from a zero baseline{mark}."
    steady = ", steady" if abs(delta90) < FLAT_DELTA else ""
    return f"{label} over 90 days: {pct(delta90)}{steady}{mark}."


def _shapes(d: dict, kind: str, days: int):
    """Yields (field, en, zh) per shape — one pair per append, same
    conditionals both sides, so en[i] and zh[i] always state the same fact.
    zh sentences end with 。 and use the same ASCII numbers as en."""
    label, unit, per = METRIC_META[d["metric"]]
    zlabel, zunit, zper = METRIC_META_ZH[d["metric"]]
    mark = _mark(d)
    zmark = SAMPLE_MARK_ZH if mark else ""
    total = d["period_total"]
    avg = d["period_avg"]
    prev = d["prev_total"]
    delta = d["delta_pct"]
    delta90 = d["delta90_pct"]

    kind_zh = "本月" if kind == "month" else "本周"
    prev_zh = "上个月" if kind == "month" else "上周"

    # FACT — total, change vs previous period, from-zero, per-day rate
    yield (
        "fact",
        f"{label}: {num(total)} {unit} this {kind}{mark}.",
        f"{zlabel}：{kind_zh} {num(total)} {zunit}{zmark}。",
    )
    if prev > 0 and abs(delta) >= FLAT_DELTA:
        yield (
            "fact",
            f"{label}: {num(total)} {unit} this {kind}, {pct(delta)} vs the previous {kind}{mark}.",
            f"{zlabel}：{kind_zh} {num(total)} {zunit}，比{prev_zh} {pct(delta)}{zmark}。",
        )
    if prev == 0 and total > 0:
        yield (
            "fact",
            f"{label}: {num(total)} {unit} this {kind} — the previous {kind} had none{mark}.",
            f"{zlabel}：{kind_zh} {num(total)} {zunit} —— {prev_zh}没有记录{zmark}。",
        )
    yield (
        "fact",
        f"{label}: {num(avg)} {unit}/{per} this {kind}{mark}.",
        f"{zlabel}：{kind_zh}平均每{zper} {num(avg)} {zunit}{zmark}。",
    )

    # TREND — 90-day direction (zero baseline is a defined case), then the
    # short-window-vs-long-window divergence, the most interesting pick
    steady_zh = "，平稳" if abs(delta90) < FLAT_DELTA else ""
    yield (
        "trend",
        trend90_line(label, d, mark),
        f"{zlabel} 过去 90 天：{pct(delta90)}{steady_zh}{zmark}。"
        if not (d["prev90_total"] == 0 and d["period90_total"] > 0)
        else f"{zlabel} 过去 90 天：从零基线 +100%{zmark}。",
    )
    if delta * delta90 < 0 and abs(delta) >= FLAT_DELTA and abs(delta90) >= FLAT_DELTA:
        yield (
            "trend",
            f"{label}: {pct(delta)} this {kind} vs {pct(delta90)} over 90 days{mark}.",
            f"{zlabel}：{kind_zh} {pct(delta)}，过去 90 天 {pct(delta90)}{zmark}。",
        )

    # GAP + ACTION — only goals with room to close
    mode = d["goal"].get("mode")
    if mode and d["completion"] < 1.0:
        if mode == "day":
            t = float(d["goal"]["target"])
            yield (
                "gap",
                f"{label}: {of_goal(d['completion'])}% of the {num(t)} {unit}/day goal{mark}.",
                f"{zlabel}：达成每天 {num(t)} {zunit}目标的 {of_goal(d['completion'])}%{zmark}。",
            )
            short = whole(t - avg)
            if short > 0:
                yield (
                    "gap",
                    f"{label}: {short} {unit}/day short of the {num(t)} {unit}/day goal{mark}.",
                    f"{zlabel}：距每天 {num(t)} {zunit}目标还差 {short} {zunit}{zmark}。",
                )
                yield (
                    "action",
                    f"{label}: add about {short} {unit}/day to reach the {num(t)} {unit}/day goal{mark}.",
                    f"{zlabel}：每天再增加约 {short} {zunit}，达到每天 {num(t)} {zunit}目标{zmark}。",
                )
        elif mode == "week":
            t = float(d["goal"]["target"])
            yield (
                "gap",
                f"{label}: {of_goal(d['completion'])}% of the {num(t)}/week goal{mark}.",
                f"{zlabel}：达成每周 {num(t)} {zunit}目标的 {of_goal(d['completion'])}%{zmark}。",
            )
            if kind == "week":
                short = whole(t - total)
                if short > 0:
                    yield (
                        "gap",
                        f"{label}: {short} {unit} short of the {num(t)}/week goal{mark}.",
                        f"{zlabel}：距每周 {num(t)} {zunit}目标还差 {short} {zunit}{zmark}。",
                    )
                    yield (
                        "action",
                        f"{label}: complete {short} more {unit} this week to reach the {num(t)}/week goal{mark}.",
                        f"{zlabel}：本周再完成 {short} {zunit}，达到每周 {num(t)} {zunit}目标{zmark}。",
                    )
            else:
                # month window: the weekly target is a pace, not a total
                pace = whole(t - total / (days / 7))
                if pace > 0:
                    yield (
                        "action",
                        f"{label}: average {pace} more {unit}/week to reach the {num(t)}/week goal{mark}.",
                        f"{zlabel}：每周平均再完成 {pace} {zunit}，达到每周 {num(t)} {zunit}目标{zmark}。",
                    )
        else:  # band
            target_text = str(d["goal"]["target"])
            band = _band(d)
            direction = None
            if band is not None:
                lo, hi = band
                direction = "below" if avg < lo else "above" if avg > hi else None
            if direction:
                zdir = "低于" if direction == "below" else "高于"
                yield (
                    "gap",
                    f"{label}: {num(avg)} {unit}/{per} — {direction} the {target_text} band{mark}.",
                    f"{zlabel}：平均每{zper} {num(avg)} {zunit} —— {zdir} {target_text} 区间{zmark}。",
                )
            else:
                yield (
                    "gap",
                    f"{label}: {num(avg)} {unit}/{per} — outside the {target_text} band{mark}.",
                    f"{zlabel}：平均每{zper} {num(avg)} {zunit} —— 在 {target_text} 区间外{zmark}。",
                )
            yield (
                "action",
                f"{label}: aim inside the {target_text} {unit} band — the last {kind} averaged {num(avg)} {unit}/{per}{mark}.",
                f"{zlabel}：保持 {target_text} {zunit}区间内 —— {kind_zh}平均每{zper} {num(avg)} {zunit}{zmark}。",
            )


def _build(summary: dict) -> tuple[dict[str, list[str]], dict[str, list[str]]]:
    """One pass, both languages — en[i] and zh[i] are always the same fact
    about the same number, so Jev's pick maps by index. Dedupe by pair keeps
    the two sides in lockstep."""
    kind = _period_word(summary)
    days = summary["period"]["days"]
    en: dict[str, list[str]] = {f: [] for f in FIELD_ORDER}
    zh: dict[str, list[str]] = {f: [] for f in FIELD_ORDER}
    for d in _eligible(summary):
        for field, e, z in _shapes(d, kind, days):
            en[field].append(e)
            zh[field].append(z)
    for field in FIELD_ORDER:
        pairs = list(dict.fromkeys(zip(en[field], zh[field])))
        en[field] = [e for e, _ in pairs][:MAX_OPTIONS]
        zh[field] = [z for _, z in pairs][:MAX_OPTIONS]
    return en, zh


def build_candidates(summary: dict) -> dict[str, list[str]]:
    """{"fact": [...], "trend": [...], "gap": [...], "action": [...]} — en.

    no_data domains produce zero candidates (Jev never reasons about a hole
    in the data); mock_only domains stay eligible and carry "(sample history)".
    Deterministic: domains iterate in summary order, shapes in fixed order.
    """
    return _build(summary)[0]


def build_candidates_zh(summary: dict) -> dict[str, list[str]]:
    """The zh twin of build_candidates — aligned by index (en[i] ↔ zh[i])."""
    return _build(summary)[1]


def build_fixed(summary: dict) -> dict[str, str]:
    """The fixed sentence used whenever a field has zero candidates.

    All digit-free on purpose (the trend sentence's "90" is the window
    label): the number-provenance test covers fallbacks trivially. no_data →
    the "No data yet" set; data present with nothing to close → the
    "on target" set (gap/action only — fact/trend always have candidates
    once any domain has data).
    """
    if not _eligible(summary):
        return dict(NO_DATA_FIXED)
    return dict(ON_TARGET_FIXED)


def build_fixed_zh(summary: dict) -> dict[str, str]:
    """zh twin of build_fixed — same two sets, same decision."""
    if not _eligible(summary):
        return dict(NO_DATA_FIXED_ZH)
    return dict(ON_TARGET_FIXED_ZH)


# The header's "clearest 90-day trend" question — one option per domain,
# keyed by the domain key the web understands (DOMAIN_META order), described
# by the domain's PRIMARY metric trend sentence (reading/workouts stay out:
# the web's header loop combines only primary+extra per domain).
TOP_PRIMARY: dict[str, str] = {
    "learning": "learning.study.minutes",
    "english": "english.words.reviewed",
    "coding": "coding.commits",
    "health": "health.sleep.minutes",
    "productivity": "productivity.tasks.completed",
}

TOP_INSTRUCTIONS = (
    'One domain is featured in the home header as the "clearest 90-day trend". '
    "Which domain's direction over the last 90 days is most worth putting on top? "
    "Judge the quality of the evidence, not just the size of the number: a +100% "
    "from a zero baseline is weaker evidence than a clear change on real history. "
    "Select exactly one option key — never edit or extend its description."
)


def build_top_options(summary: dict) -> dict[str, str]:
    """{domainKey: primary-metric 90-day sentence} — one per domain with REAL
    data. mock_only domains stay out (a hard code rule beats a prompt hope —
    Jev still preferred a sample-history +100% over real data). The sentence
    shapes match TREND (zero baseline is a defined case); the numbers come
    from the summary's own 90-day totals."""
    options: dict[str, str] = {}
    for d in _eligible(summary):
        if d["metric"] != TOP_PRIMARY.get(d["domain"]):
            continue
        if d["data_state"] != "has_real_data":
            continue
        label, _, _ = METRIC_META[d["metric"]]
        options[d["domain"]] = trend90_line(label, d)
    return options


def build_questions(candidates: dict[str, list[str]]) -> dict[str, dict]:
    """Only non-empty fields; each a Choice whose criteria keys ARE the
    candidate sentences (null rubrics — the sentences are self-separating).
    The answer's `choice` is guaranteed to be one of these keys."""
    questions: dict[str, dict] = {}
    for field in FIELD_ORDER:
        options = candidates.get(field) or []
        if not options:
            continue
        questions[field] = {
            "type": "choice",
            "instructions": INSTRUCTIONS[field] + " " + SHARED_SUFFIX,
            "criteria": {s: None for s in options},
        }
    return questions

