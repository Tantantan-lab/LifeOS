# LifeOS — Data Model

## The unified Event

Everything becomes one row shape. One hundred future data sources must not
require a new schema each.

```
event_id    string   `${dateKey}:${domain}:${metric}:${seq}` — stable, human-debuggable
user_id     string   "user_local_001"
timestamp   string   ISO 8601 with offset, e.g. "2026-09-18T21:40:00+08:00"
domain      enum     study | english | fitness | coding | sleep
metric      string   e.g. study_minutes, vocabulary_review, workout_session
value       number   metric units
unit        string   min | words | commits | session | band
source      enum     manual | timer | github | anki | apple_health | hevy
confidence  number   0..1 — device 0.95, inferred 0.7, manual 1.0
metadata    jsonb    per-event extras (subject, repo, workout type, IELTS subscores)
```

Examples: `{study, study_minutes, 120, min, timer}` · `{health→sleep,
sleep_minutes, 428, min, apple_health}` · `{coding, commits, 4, commits,
github}` · `{english, vocabulary_review, 137, words, anki}`.

## Metric catalog (current mock)

| Domain | metric | cadence | goal |
|---|---|---|---|
| study | `study_minutes` | daily, 1–2 sessions | 120 min/day |
| english | `vocabulary_review` | daily | 40 words/day |
| english | `english_minutes` | daily | — |
| english | `ielts_mock_band` | ~every 21 days | band walk 5.5 → 6.0 (+ 6.5 spike) |
| fitness | `workout_session` | 2–3×/week, slot-based (Mon/Tue/Thu/Sat) | 3 sessions/week |
| coding | `coding_commits` + `coding_minutes` | daily | 10 commits/week |
| sleep | `sleep_minutes` | 1/day, attributed to wake date | 6.5–7.5h band |

## Determinism (M1 mock)

- `ANCHOR_DATE = "2026-09-19"` — a **fixed constant**, never `new Date()`:
  static prerendering would freeze "today" into the HTML.
- Every per-day value = `hash(SEED, domain, dateKey)` via FNV-1a →
  mulberry32. Zero `Math.random()`; order-independent; past days never
  change. `SEED = 271828`, chosen by sweep so the one-year story reads
  study +36% / english +33% / fitness stable / coding +39% with a
  believable last-30-days for every domain.
- Improvement curves use **easeInQuad spread across the whole window**
  (easeOutCubic saturates too early — at 2/3 of the window it's already
  96% done, which made recent deltas flat and old deltas enormous).
- Grid geometry: data 2025-09-20 → 2026-09-19 (365 days), Sunday-aligned
  grid start 2025-09-14 = **53 weeks × 7 = 371 cells, 6 leading blanks**.
  Today is the bottom-right cell.
- The readiness hero is asserted in dev: weighted skills must round to 72
  (`selectors.ts`) — it cannot drift from the spec unnoticed.

## Heatmap completion rules

- study / english: `min(1, value / dayGoal)`.
- fitness / coding: `min(1, trailing7 / weeklyGoal)` — a weekly goal on a
  daily cell needs a trailing window.
- All view: mean of the four domain completions (sleep excluded).
- Levels: 0% / 1–25 / 25–50 / 50–80 / 80–100, **capped at 100%**.

## Me vs Me windows

| Tab | NOW (inclusive, counting back from anchor) | THEN |
|---|---|---|
| 30D | anchor−29 … anchor | anchor−59 … anchor−30 |
| 90D | anchor−89 … anchor | anchor−179 … anchor−90 |
| 1Y | anchor−181 … anchor (182d) | anchor−364 … anchor−183 |
| Beginning | anchor−29 … anchor | anchor−364 … anchor−335 |

The UI always prints the resolved ranges under the tabs ("NOW: Aug 21 –
Sep 19 · THEN: Jul 22 – Aug 20") — no ambiguous "1Y vs what?".

Per-domain aggregation: study/english/sleep = avg/day, fitness = total
sessions, coding = total hours (`coding_minutes`). Weekly chart buckets
compare against `thenAvg × 7` so the dashed THEN reference is
week-equivalent.

## Benchmark (Overseas Engineer)

| Skill | You | Target | Weight |
|---|---|---|---|
| Python | 86 | 86 | 0.20 |
| Linux | 80 | 84 | 0.15 |
| Docker | 74 | 80 | 0.15 |
| Kubernetes | 50 | 85 | 0.25 |
| English | 76 | 90 | 0.25 |

Weighted mean = 71.8 → **72% ready**. Gap ranking: Kubernetes (35) →
English (14) → Docker (6) → Linux (4) → Cloud (not started). Pace
estimates assume 2.5 pts/week.

## M2 swap contract

- Components import **only from `src/data/selectors.ts`**. Nothing else
  may import `generator.ts` / `events.ts`.
- All selectors are **async** and return the DTOs in `src/data/types.ts`.
  M2/M3 replace the function bodies with API calls (FastAPI serves these
  DTOs from `packages/analytics`) — **zero component changes**.
- All date math happens server-side; client components receive date
  strings only (the single guard against hydration mismatch).
- React `cache()` is deliberately not used — Next 16 superseded it with
  Cache Components; selectors are called once per page render anyway.
