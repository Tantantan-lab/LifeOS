"""Structured summary builder — the ONLY input the model (Jev) ever sees.

Mirrors the web selectors' math (delta windows, goal completion,
consistency) and tags every domain with a data_state so the insights
pipeline never presents demo numbers as the user's life:
  has_real_data  → at least one connector row in the window
  mock_only      → only demo rows
  no_data        → nothing at all
"""

from datetime import date, timedelta
from typing import Any

from . import db

GOAL_DAY: dict[str, float] = {
    "learning.study.minutes": 120,
    "learning.reading.minutes": 30,
    "english.words.reviewed": 40,
}
GOAL_WEEK: dict[str, float] = {
    "coding.commits": 10,
    "health.workout.session": 3,
    "productivity.tasks.completed": 15,
}
SLEEP_BAND = (390, 450)

DEFAULT_METRICS = [
    ("learning", "learning.study.minutes"),
    ("learning", "learning.reading.minutes"),
    ("english", "english.words.reviewed"),
    ("coding", "coding.commits"),
    ("health", "health.workout.session"),
    ("health", "health.sleep.minutes"),
    ("productivity", "productivity.tasks.completed"),
]


async def build_summary(period_start: date, period_end: date) -> dict[str, Any]:
    """period = the insight window (last 7 / last 30 days ending today)."""
    user_id = await db.owner_id()
    days = (period_end - period_start).days + 1
    prev_start = period_start - timedelta(days=days)
    prev_end = period_start - timedelta(days=1)
    window90_start = period_end - timedelta(days=89)
    prev90_start = window90_start - timedelta(days=90)

    async with (await db.pool()).acquire() as con:
        # daily sums per (domain, metric, day, real?) over the needed span
        rows = await con.fetch(
            """
            select e.domain, e.metric, e.local_date::text as d, sum(e.value)::float as v,
                   bool_or(e.event_id like 'conn:%') as real
              from events e
             where e.user_id = $1
               and e.local_date between $2 and $3
             group by e.domain, e.metric, e.local_date
             order by e.domain, e.metric, e.local_date
            """,
            user_id,
            window90_start - timedelta(days=90),
            period_end,
        )
        sources_rows = await con.fetch(
            "select source, connected, last_sync_at::text"
            " from data_sources where user_id = $1",
            user_id,
        )

    # metric → dateKey → (value, has_real_source)
    by_metric: dict[str, dict[str, tuple[float, bool]]] = {}
    for r in rows:
        by_metric.setdefault(r["metric"], {})[r["d"]] = (r["v"], r["real"])

    def window_sum(metric: str, start: date, end: date) -> tuple[float, bool]:
        series = by_metric.get(metric, {})
        total = 0.0
        has_real = False
        d = start
        while d <= end:
            hit = series.get(d.isoformat())
            if hit:
                total += hit[0]
                has_real = has_real or hit[1]
            d += timedelta(days=1)
        return total, has_real

    domains: list[dict[str, Any]] = []
    for domain, metric in DEFAULT_METRICS:
        last, real_last = window_sum(metric, period_start, period_end)
        prev, _ = window_sum(metric, prev_start, prev_end)
        last90, real90 = window_sum(metric, window90_start, period_end)
        prev90, _ = window_sum(metric, prev90_start, window90_start - timedelta(days=1))
        delta = _delta(last, prev)
        delta90 = _delta(last90, prev90)

        if metric in GOAL_DAY:
            target = GOAL_DAY[metric]
            completion = min(1.0, (last / days) / target) if days else 0.0
            goal_desc = {"mode": "day", "target": target}
        elif metric in GOAL_WEEK:
            target = GOAL_WEEK[metric]
            completion = min(1.0, last / max(days / 7, 1) / target) if days else 0.0
            goal_desc = {"mode": "week", "target": target}
        elif metric == "health.sleep.minutes":
            lo, hi = SLEEP_BAND
            avg = last / days if days else 0
            completion = 1.0 if lo <= avg <= hi else 0.5
            goal_desc = {"mode": "band", "target": f"{lo}-{hi}"}
        else:
            completion = 0.0
            goal_desc = {"mode": None, "target": None}

        if last == 0 and prev == 0 and last90 == 0:
            data_state = "no_data"
        elif real_last or real90:
            data_state = "has_real_data"
        else:
            data_state = "mock_only"

        domains.append(
            {
                "domain": domain,
                "metric": metric,
                "period_total": round(last, 1),
                "period_avg": round(last / days, 1) if days else 0.0,
                "prev_total": round(prev, 1),
                "delta_pct": round(delta, 1),
                "period90_total": round(last90, 1),
                "prev90_total": round(prev90, 1),
                "delta90_pct": round(delta90, 1),
                "goal": goal_desc,
                "completion": round(completion, 3),
                "data_state": data_state,
            }
        )

    return {
        "generated_at": date.today().isoformat(),
        "period": {
            "kind": "week" if days <= 7 else "month",
            "start": period_start.isoformat(),
            "end": period_end.isoformat(),
            "days": days,
        },
        "timezone": "Asia/Shanghai",
        "domains": domains,
        "data_sources": [
            {
                "source": r["source"],
                "connected": r["connected"],
                "last_sync_at": r["last_sync_at"],
            }
            for r in sources_rows
        ],
        "notable": [
            f"{d['metric']}: {'+' if d['delta_pct'] >= 0 else ''}{d['delta_pct']:.0f}% over the period"
            for d in sorted(domains, key=lambda x: -abs(x["delta_pct"]))
            if d["data_state"] != "no_data"
        ][:4],
    }


def _delta(now: float, then: float) -> float:
    """Mirrors the web's deltaPctOf (selectors.ts): a zero or negligible
    (< 1% of now) baseline is new data (+100%); otherwise clamp to ±999% —
    past ~10x a percentage stops meaning anything to a reader."""
    if then <= 0:
        return 100.0 if now > 0 else 0.0
    if then < now * 0.01:
        return 100.0
    return max(-999.0, min(999.0, (now - then) / then * 100))
