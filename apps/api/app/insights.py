"""TypeSafe insights CLI:

    python -m app.insights --period week --print
    python -m app.insights --period week --dry-run   # summary + questions, no API call

Pipeline: analytics summary → candidate sentences (candidates.py, numbers
rendered by code, en/zh aligned pairs) → ONE batched TypeSafe call, one
Choice question per field (Jev selects an EN option — the chosen key IS the
sentence, stored verbatim with its zh twin) → validation safety net →
insights table upsert (content {fact: {en,zh}, ...}, audit trail in meta).
"""

import argparse
import asyncio
import json
import re
from datetime import date, timedelta

from pydantic import BaseModel, Field

from . import analytics, candidates, db, typesafe
from .config import settings

BANNED = re.compile(
    r"\b(bad|poor|fail|failure|failed|missed|lazy|disappointing|worst|"
    r"excuse|should have|percentile|rank|better than)\b",
    re.IGNORECASE,
)


class InsightContent(BaseModel):
    fact: str = Field(min_length=1)
    trend: str = Field(min_length=1)
    gap: str = Field(min_length=1)
    action: str = Field(min_length=1)


def _resolve(
    cand: dict[str, list[str]],
    cand_zh: dict[str, list[str]],
    fixed: dict[str, str],
    fixed_zh: dict[str, str],
    resp: dict | None,
) -> tuple[dict[str, dict[str, str]], dict[str, dict]]:
    """Maps the TypeSafe answers back to sentence pairs — verbatim.

    A Choice answer guarantees its key is one of the criteria keys we sent,
    so `content[field]["en"] = answer.choice` copies the exact templated
    sentence, and its zh twin comes from the same index (the two candidate
    lists are aligned by construction). Missing/unknown answers fall back to
    the first pair, never an error.
    """
    content: dict[str, dict[str, str]] = {}
    fields: dict[str, dict] = {}
    for field in candidates.FIELD_ORDER:
        options = cand.get(field) or []
        options_zh = cand_zh.get(field) or []
        if not options:
            content[field] = {"en": fixed[field], "zh": fixed_zh[field]}
            fields[field] = {"source": "fixed", "reason": "no_candidates"}
            continue
        answer = typesafe.choice(resp, field) if resp else None
        if answer is None or answer.choice not in options:
            content[field] = {"en": options[0], "zh": options_zh[0]}
            fields[field] = {
                "source": "fallback",
                "reason": "missing_or_unknown_answer",
                "options": options,
                "answer": None if answer is None else answer.choice,
            }
            continue
        content[field] = {
            "en": answer.choice,
            "zh": options_zh[options.index(answer.choice)],
        }
        fields[field] = {
            "source": "selected",
            "options": options,
            "choice": answer.choice,
            "confidence": answer.confidence,
            "probabilities": answer.probabilities,
        }
    return content, fields


def _sanitize(
    content: dict[str, dict[str, str]],
    fixed: dict[str, str],
    fixed_zh: dict[str, str],
) -> tuple[dict[str, dict[str, str]], list[str], list[str]]:
    """pydantic + banned-word safety net, both languages. Templates are clean
    by construction (test_candidates.py proves it), so this should never
    fire — but a stored insight must always be four non-empty,
    judgment-free sentence pairs. A violating field swaps BOTH sides."""
    out = dict(content)
    banned_hits: list[str] = []
    repaired: list[str] = []
    for field in candidates.FIELD_ORDER:
        entry = out.get(field)
        en_text = entry.get("en", "") if isinstance(entry, dict) else ""
        zh_text = entry.get("zh", "") if isinstance(entry, dict) else ""
        en_found = BANNED.findall(en_text) if isinstance(en_text, str) else None
        zh_found = candidates.ZH_BANNED.findall(zh_text) if isinstance(zh_text, str) else None
        bad = bool(en_found or zh_found) or not isinstance(en_text, str) or not en_text.strip() \
            or not isinstance(zh_text, str) or not zh_text.strip()
        if bad:
            if en_found or zh_found:
                banned_hits.append(f"{field}: {(en_found or []) + (zh_found or [])}")
            repaired.append(field)
            out[field] = {"en": fixed[field], "zh": fixed_zh[field]}
    InsightContent.model_validate({f: out[f]["en"] for f in candidates.FIELD_ORDER})
    return out, repaired, banned_hits


async def build_payload(
    period_start: date, period_end: date, dry_run: bool = False
) -> dict:
    """summary → candidates → (one batched API call) → flat content + meta.
    No DB writes, no clock."""
    summary = await analytics.build_summary(period_start, period_end)
    cand = candidates.build_candidates(summary)
    cand_zh = candidates.build_candidates_zh(summary)
    fixed = candidates.build_fixed(summary)
    fixed_zh = candidates.build_fixed_zh(summary)
    questions = candidates.build_questions(cand)

    # The header's "clearest 90-day trend" pick rides the same batched call —
    # one extra Choice (≈ free), answer stored under meta.top. A single real
    # domain has no editorial value — the web's fallback already covers it.
    top_options = candidates.build_top_options(summary)
    if len(top_options) >= 2:
        questions["top"] = {
            "type": "choice",
            "instructions": candidates.TOP_INSTRUCTIONS,
            "criteria": top_options,
        }

    resp: dict | None = None
    model = "none"
    usage = None
    skipped = None
    if not questions:
        skipped = "no_candidates"  # every field empty → no API call
    elif not dry_run:
        resp = await typesafe.ask(summary, questions)
        model = str(resp.get("model") or settings.typesafe_model)
        usage = resp.get("usage")

    top = None
    if top_options and resp is not None:
        answer = typesafe.choice(resp, "top")
        if answer is not None and answer.choice in top_options:
            top = {
                "choice": answer.choice,
                "confidence": answer.confidence,
                "probabilities": answer.probabilities,
                "options": top_options,
            }

    content, fields = _resolve(cand, cand_zh, fixed, fixed_zh, resp)
    content, repaired, banned = _sanitize(content, fixed, fixed_zh)
    meta = {
        "schema": 1,
        "generator": "typesafe-choice",
        "model": model,
        "usage": usage,
        "skipped": skipped,
        "counts": {f: len(cand[f]) for f in candidates.FIELD_ORDER},
        "fields": fields,
        "top": top,
        "validation": {"banned_hits": banned, "repaired": repaired},
    }
    return {
        "summary": summary,
        "content": content,
        "meta": meta,
        "questions": questions,
        "candidates": cand,
        "fixed": fixed,
        "provider": "typesafe",
        "model": model,
    }


async def store(
    period: str,
    period_start: date,
    period_end: date,
    summary: dict,
    content: dict,
    meta: dict,
    provider: str,
    model: str,
) -> None:
    """The ONLY DB write — tests monkeypatch this seam."""
    user_id = await db.owner_id()
    async with (await db.pool()).acquire() as con:
        await con.execute(
            """
            insert into insights (user_id, period, period_start, period_end, provider,
                                  model, summary, content, meta)
            values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            on conflict (user_id, period, period_start) do update set
              provider = excluded.provider,
              model = excluded.model,
              period_end = excluded.period_end,
              summary = excluded.summary,
              content = excluded.content,
              meta = excluded.meta,
              created_at = now()
            """,
            user_id,
            period,
            period_start,  # date objects — asyncpg maps datetime.date natively
            period_end,
            provider,
            model,
            json.dumps(summary, ensure_ascii=False),
            json.dumps(content, ensure_ascii=False),  # {fact: {en,zh}, ...} — web picks by locale
            json.dumps(meta, ensure_ascii=False),
        )


def _print_dry(payload: dict) -> None:
    print(json.dumps(payload["summary"], ensure_ascii=False, indent=2))
    print("\n--- state ---\nthe summary above is the state")
    print("\n--- questions (not sent) ---")
    print(json.dumps(payload["questions"], ensure_ascii=False, indent=2))
    print("\n--- candidates ---")
    print(json.dumps({f: len(payload["candidates"][f]) for f in candidates.FIELD_ORDER}))
    print("\n--- fixed (used only where a field has no candidates) ---")
    print(json.dumps(payload["fixed"], ensure_ascii=False, indent=2))


async def generate(period: str, dry_run: bool = False, print_out: bool = False) -> dict:
    today = date.today()
    days = 7 if period == "week" else 30
    period_start = today - timedelta(days=days - 1)

    payload = await build_payload(period_start, today, dry_run=dry_run)
    if dry_run:
        if print_out:
            _print_dry(payload)
        return {"status": "dry", **payload}

    await store(
        period,
        period_start,
        today,
        payload["summary"],
        payload["content"],
        payload["meta"],
        payload["provider"],
        payload["model"],
    )
    if print_out:
        print(
            json.dumps(
                {"content": payload["content"], "meta": payload["meta"]},
                ensure_ascii=False,
                indent=2,
            )
        )
    return {"status": "ok", "content": payload["content"], "meta": payload["meta"]}


def main() -> None:
    parser = argparse.ArgumentParser(description="LifeOS TypeSafe insights")
    parser.add_argument("--period", default="week", choices=["week", "month"])
    parser.add_argument("--print", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    asyncio.run(generate(args.period, args.dry_run, args.print))


if __name__ == "__main__":
    main()
