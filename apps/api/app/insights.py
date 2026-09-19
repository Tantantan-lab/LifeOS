"""AI insights CLI:

    python -m app.insights --period week --print     # generate + store + print
    python -m app.insights --period week --dry-run   # summary + prompt only, no LLM

Pipeline: analytics summary → prompt (FACT/TREND/GAP/ACTION, numbers
verbatim, banned words) → LLM JSON → validation → insights table upsert
(one row per user+period+period_start).
"""

import argparse
import asyncio
import json
import re
from datetime import date, timedelta

from pydantic import BaseModel, Field, ValidationError

from . import analytics, db, llm
from .config import settings

BANNED = re.compile(
    r"\b(bad|poor|fail|failure|failed|missed|lazy|disappointing|worst|"
    r"excuse|should have|percentile|rank|better than)\b",
    re.IGNORECASE,
)

SYSTEM = """You write LifeOS insights. Output ONLY JSON:
{"fact": "...", "trend": "...", "gap": "...", "action": "..."}
Rules
- Every sentence must use numbers copied verbatim from the summary JSON. Never invent a number.
- FACT = what the data says. TREND = direction over 30/90 days. GAP = distance to the user's own goal. ACTION = one concrete next step with a number.
- 1-3 sentences per field, at most 60 words each, numbers-first, no preamble.
- Banned words: bad, poor, fail, failure, failed, missed, lazy, should have, disappointing, worst, excuse, percentile, rank, better than.
- Never compare the user with other people. The benchmark is their past self and their stated goals.
- Domains with data_state "no_data" -> say "no data yet"; never infer. Say "sample history" when data_state is "mock_only".
- No medical, financial or psychological advice. Observations and next actions only.
"""


class InsightContent(BaseModel):
    fact: str = Field(min_length=1)
    trend: str = Field(min_length=1)
    gap: str = Field(min_length=1)
    action: str = Field(min_length=1)


def _validate(content: dict) -> InsightContent:
    return InsightContent.model_validate(
        {k: content.get(k, "") for k in ("fact", "trend", "gap", "action")}
    )


def _check_banned(content: InsightContent) -> list[str]:
    hits = []
    for field in ("fact", "trend", "gap", "action"):
        text = getattr(content, field)
        found = BANNED.findall(text)
        if found:
            hits.append(f"{field}: {found}")
    return hits


async def generate(period: str, dry_run: bool = False, print_out: bool = False) -> dict:
    today = date.today()
    days = 7 if period == "week" else 30
    period_start = today - timedelta(days=days - 1)

    summary = await analytics.build_summary(period_start, today)
    user = json.dumps({"period": summary["period"], "summary": summary}, ensure_ascii=False)

    if dry_run:
        if print_out:
            print(json.dumps(summary, ensure_ascii=False, indent=2))
            print("\n--- prompt ---\n" + SYSTEM + "\n--- user ---\n" + user)
        return {"status": "dry", "summary": summary}

    raw = await llm.complete_json(SYSTEM, user)
    try:
        content = _validate(raw)
    except ValidationError:
        # one stricter retry, then store with a validation note
        retried = await llm.complete_json(SYSTEM + "\nReturn ONLY the four fields.", user)
        content = _validate(retried)

    banned = _check_banned(content)
    payload = {
        "content": content.model_dump(),
        "validation": {"banned_hits": banned, "retried": "validation" not in raw.keys()},
    }

    base, model, provider = llm.resolve()
    user_id = await db.owner_id()
    async with (await db.pool()).acquire() as con:
        await con.execute(
            """
            insert into insights (user_id, period, period_start, period_end, provider,
                                  model, summary, content)
            values ($1,$2,$3,$4,$5,$6,$7,$8)
            on conflict (user_id, period, period_start) do update set
              provider = excluded.provider,
              model = excluded.model,
              summary = excluded.summary,
              content = excluded.content,
              created_at = now()
            """,
            user_id,
            period,
            period_start.isoformat(),
            today.isoformat(),
            provider,
            model,
            json.dumps(summary, ensure_ascii=False),
            json.dumps(payload, ensure_ascii=False),
        )

    if print_out:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    return {"status": "ok", **payload}


def main() -> None:
    parser = argparse.ArgumentParser(description="LifeOS AI insights")
    parser.add_argument("--period", default="week", choices=["week", "month"])
    parser.add_argument("--print", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    asyncio.run(generate(args.period, args.dry_run, args.print))


if __name__ == "__main__":
    main()
