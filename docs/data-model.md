# LifeOS — Data Model

## The unified Event

Everything becomes one row shape. One hundred future data sources must not
require a new schema each.

```
event_id    text     `${dateKey}:${domain}:${metric}:${seq}` — stable, human-debuggable
user_id     uuid     → auth.users
timestamp   timestamptz  the instant (stored UTC)
local_date  date     attributed calendar date (+08:00) — THE grouping key
local_time  text     wall-clock "HH:MM" (+08:00) — what the UI displays
domain      enum     study | english | fitness | coding | sleep
metric      text     → metrics.metric (FK — a typo fails at write time)
value       numeric  metric units (IELTS bands are x.5)
unit        text     min | words | commits | session | band
source      text     manual | timer | github | anki | apple_health | hevy
                     (deliberately NOT FK'd: provenance only — ingestion must
                     never drop data because a registry row is missing)
confidence  numeric  0..1 — device 0.95, inferred 0.7, manual 1.0
metadata    jsonb    per-event extras (subject, repo, workout type, IELTS subscores)
```

**local_date / local_time invariant**: both are DERIVED from `timestamp` by the
`events_set_local_fields` BEFORE INSERT/UPDATE trigger (Asia/Shanghai) — one
source of truth, an inconsistent row cannot be written. They are columns (not
generated) because `timezone(text, timestamptz)` is only STABLE, and generated
columns require IMMUTABLE expressions. A 07:30+08:00 wake event is stored as
23:30Z UTC; the trigger keeps it attributed to the wake date — slicing the UTC
timestamp would silently move it to the previous day.

Examples: `{study, study_minutes, 120, min, timer}` · `{health→sleep,
sleep_minutes, 428, min, apple_health}` · `{coding, commits, 4, commits,
github}` · `{english, vocabulary_review, 137, words, anki}`.

## Metric catalog (M3: five-domain taxonomy)

Names are namespaced (`domain.thing.unit`). One rule governs every name:
**same real-world quantity → same metric** (mock and real sources merge into
one series); different quantity → different metric (never merge).

| Domain | Metric | Written by | Goal |
|---|---|---|---|
| learning | `learning.study.minutes` | mock (demo) | 120 min/day — primary |
| learning | `learning.reading.minutes` | **weread** | 30 min/day (soft) |
| learning | `learning.video.minutes` | reserved (bilibili) | — |
| english | `english.words.reviewed` | mock + **maimemo** | 40 words/day — primary |
| english | `english.minutes` | mock | — |
| english | `english.ielts.mock.band` | mock | — |
| coding | `coding.commits` | mock + **github** | 10 commits/week — primary |
| coding | `coding.minutes` | mock | Me vs Me "Coding" row |
| health | `health.sleep.minutes` | mock | 6.5–7.5h band — primary |
| health | `health.workout.session` | mock (Hevy later) | 3 sessions/week |
| productivity | `productivity.tasks.completed` | **ticktick** | 15 tasks/week — primary |
| productivity | `productivity.focus.minutes` | reserved (no official API) | — |

Heatmap domains: learning / english / coding / productivity. **Health is
excluded** (sleep targets a band, not a floor). The "All" view averages
only domains with data in the trailing 30 days.

## Connector provenance (M3)

- Mock history: `source ∈ {demo, timer, anki, hevy, apple_health, manual}`
  and `event_id = {date}:{domain}:{metric}:{seq}` — the seed deletes and
  re-inserts ONLY these (re-seeding never touches connector rows).
- Connector rows: `event_id = conn:{source}:{metric}:{date}` — upsert on
  conflict; a partial unique index enforces one row per
  (user, domain, metric, day, source) for `event_id like 'conn:%'`.
- `data_sources` records `connected` + `last_sync_at` per source; tokens
  live ONLY in apps/api/.env (+ .tokens.json), never in the DB.
- Seams: GitHub reports ~30 days only; TickTick has no focus-time
  endpoint (productivity = tasks/day); Maimemo has no per-day history
  (words bucket by most-recent-review date, today prefers the
  authoritative progress endpoint).

## Insights pipeline (M3)

`analytics.py` computes a structured summary (period + 90d deltas, goal
completion, per-domain `data_state`: has_real_data / mock_only / no_data
via the conn: prefix) → `candidates.py` renders candidate sentences from
the summary's own numbers (no_data domains produce zero candidates, mock_only
sentences carry "(sample history)") → one batched TypeSafe System One call
(`state` = the summary, one Choice question per field, criteria keys ARE the
candidate sentences) → the chosen key is stored verbatim as flat
`content.fact/trend/gap/action`, each field an `{en, zh}` pair (the zh twin
comes from the same template index — Jev picks en only, code maps zh); the
selection audit trail (options, choice, probabilities, confidence, model,
usage) lands in `insights.meta` (migration 006). Jev never sees a missing
domain as an option and never writes a character of user-visible text. The
summary carries `period_avg` and
`prev90_total` so every templated number is traceable to it.

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

- study / english: `min(1, dayValue / dayGoal)`.
- fitness / coding / productivity (weekly goals): `min(1, dayValue / weeklyGoal)`
  — the cell measures the DAY ("did this day carry its share?"); a rest day
  renders empty. (M1 used a trailing-7 pace; switched to day-value 2026-09-21
  — a colored cell on a no-workout day read as a lie.)
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

## M2 read path (Postgres is live)

- One Postgres 17 container (compose.yaml, sub2api-style). The web app
  connects directly via node-postgres (`pg` Pool) with `DATABASE_URL` —
  no API gateway, no auth system. **Single user by design.**
- **Privacy is a deployment property**: the DB binds to `127.0.0.1`
  only (compose.yaml) and only server-side code holds credentials;
  `DATABASE_URL` lacks the NEXT_PUBLIC_ prefix and the `connection()`
  import in `db.ts` blocks client imports.
- Pages are **dynamic by construction**: `connection()` (next/server) is
  awaited inside `db.ts`, tying dynamic rendering to the data access point.
  The four data routes render on demand (`ƒ Dynamic`); the four placeholder
  routes stay statically prerendered. Build never touches the DB.
- `db.ts` reconstructs the M1-identical ISO timestamp string from
  `local_date + local_time +08:00` — zero timezone math in the app.
  `local_date` must be selected as `local_date::text`: node-postgres parses
  `date` columns into JS Date objects, which silently break Map-key
  lookups by "YYYY-MM-DD" strings.
- Caching: one load per server instance in production (restart to pick up
  re-seeds); ~1s TTL in dev. A failed load never poisons the cache.
- **`goals`/`metrics`/`data_sources` tables are WRITTEN but not READ in
  M2** — selectors still derive targets from `DOMAIN_META`. Reading the
  `goals` table means a metadata-driven UI refactor; that ships in M3.
- Owner resolution: `resolveOwnerUserId()` reads the single seeded `users`
  row. M3 adds manual input (write path); auth only arrives if/when the
  product goes multi-user.
- Migrations: `database/migrations/*.sql` applied in order by
  `scripts/migrate.ts` (tracks in `schema_migrations`). Data lives in
  `.data/postgres` (bind mount — backup/migration is a plain file copy,
  the sub2api compose-local pattern).

## Swap contract (unchanged from M1)

- Components import **only from `src/data/selectors.ts`**. Nothing else
  may import `db.ts` / `generator.ts`.
- All selectors are **async** and return the DTOs in `src/data/types.ts`.
  M3 replaces selector bodies with FastAPI-backed calls — **zero component
  changes**.
- All date math happens server-side; client components receive date
  strings only (the single guard against hydration mismatch).
- React `cache()` is deliberately not used — Next 16 superseded it with
  Cache Components; selectors are called once per page render anyway.
