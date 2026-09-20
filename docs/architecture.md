# LifeOS — Architecture

> **Compete with your past. Benchmark against the world.**
> **No judgment. Just evidence.**

LifeOS is not a todo list or habit tracker. It aggregates real life data
(study, English, fitness, coding, sleep, …) into one unified event stream
and answers three questions:

1. **What have I done?** — Contribution Heatmap
2. **How much have I changed?** — Me vs Me
3. **Where do I go next?** — Gap → Next Best Action

## Core loop

```
real life → automatic collection → unified data → 7/30/90/365-day trends
→ Me vs Me → goal gap → AI analysis → next best action → action → new data
```

## Product rules

- **Your own history is the standard of evaluation.** Other people's data
  is only a benchmark — it sets the coordinates, never the verdict.
- **Private by default.** Health, finance, location, work — everything is
  visible only to its owner. Benchmarks use anonymous aggregates / public
  job requirements, never individual people's data.
- **Every feature must answer at least one of the four questions:** does
  it produce objective data? does it compare you with your past self? does
  it show distance to target? does it help decide the next step? Four
  "no"s — don't build it.

## Technical architecture

```
LifeOS Web (Next.js + TS + Tailwind + shadcn/ui + Recharts)
        │ API
LifeOS Backend (Python + FastAPI + Pydantic + background jobs)
        │
Supabase (PostgreSQL · Auth · RLS · Storage)
        │
Connectors (GitHub / Apple Health / Calendar / Anki / Hevy / Gmail / Finance / Manual)
        │  → Event Queue → Normalize → PostgreSQL
Analytics Engine → structured summary JSON → LLM → FACT / TREND / GAP / ACTION
```

The AI never reads raw events — the analytics engine precomputes a
structured summary, which keeps the LLM grounded in numbers.

## Monorepo layout

```
compose.yaml        full stack in containers (sub2api-style): web + api + postgres:17,
                    all ports bound to 127.0.0.1, data bind-mounted at .data/postgres
apps/web            Next.js — UI; reads events via src/data/db.ts (pg Pool)
apps/web/Dockerfile multi-stage build, standalone runner
apps/web/scripts    migrate.ts + seed.ts + cdp-check.cjs (tsx / node)
apps/api            FastAPI — connector engine + AI insights (M3)
apps/api/app        connectors/{github,weread,maimemo,ticktick}.py, sync CLI,
                    analytics → llm → insights pipeline
apps/api/scripts    — (auth helper lives in app/ticktick_auth.py)
packages/ui         shared design system, extracted from apps/web (M4)
packages/analytics  aggregations / trends / gap math (M4)
packages/connectors importers (M4 — more sources)
database/migrations PostgreSQL DDL, applied by scripts/migrate.ts
docs                this directory
```

## Run modes

- **Container mode**: `npm run up` — web + api + db in Docker (3 containers),
  the sub2api deployment shape. `npm run down` stops everything.
- **Dev mode**: `npm run db:up` + `npm run dev` — hot reload on the host,
  database in its container.

## Roadmap

| Milestone | Scope | Status |
|---|---|---|
| M1 | UI: Home / Contribution / Me vs Me / Goals + design system, deterministic mock data | ✅ done |
| M2 | Database: users / events / goals / metrics / data_sources on one plain Postgres container (sub2api-style), seeded 365-day history, read path switched to the DB, private-by-default via localhost-only binding | ✅ done |
| M3 | Five-domain taxonomy (learning/english/coding/health/productivity), connector engine (GitHub + WeRead + Maimemo + TickTick, all official APIs), AI insights pipeline (analytics summary → DeepSeek → FACT/TREND/GAP/ACTION), real "today" | ✅ done (live syncs pending the user's credentials) |
| M4 | Interaction gaps from the Master UI Prompt: Next Best Action (with reason), Heatmap Day Detail, Dashboard Header, Daily Goal ring, Data Sources page | ✅ done |
| M5 | Finance / Nutrition domains, Health page, more connectors, manual input | next |
| M4 | Analytics: 7D / 30D / 90D / 365D + connectors foundation | |
| M5 | GitHub connector — first automatic source | |
| M6 | AI insights (weekly review) | |
| M7 | Health / Calendar / Vocabulary connectors | |
| M8 | PWA | |
