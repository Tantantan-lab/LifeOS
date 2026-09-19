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
apps/web            Next.js — UI; reads events via src/data/db.ts
apps/web/scripts    seed.ts + rls-check.ts (tsx, `npm run seed`)
apps/api            FastAPI (M3)
packages/ui         shared design system, extracted from apps/web (M4)
packages/analytics  aggregations / trends / gap math (M3)
packages/connectors importers (M4)
supabase/           local Supabase project: config.toml + migrations/ (PostgreSQL DDL)
database/           README pointer to supabase/migrations/
docs                this directory
```

## Roadmap

| Milestone | Scope | Status |
|---|---|---|
| M1 | UI: Home / Contribution / Me vs Me / Goals + design system, deterministic mock data | ✅ done |
| M2 | Database: profiles / events / goals / metrics / data_sources (local Supabase, Docker), seeded 365-day history, RLS private-by-default, read path switched to Postgres | ✅ done |
| M3 | Manual input + FastAPI analytics API + login (supabase-ssr) | next |
| M4 | Analytics: 7D / 30D / 90D / 365D + connectors foundation | |
| M5 | GitHub connector — first automatic source | |
| M6 | AI insights (weekly review) | |
| M7 | Health / Calendar / Vocabulary connectors | |
| M8 | PWA | |
