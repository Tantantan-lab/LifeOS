# LifeOS

> **Compete with your past. Benchmark against the world.**
> 和过去的自己竞争，用世界作为坐标。
>
> **No judgment. Just evidence.**
> 不评价，只提供证据。

LifeOS is not a todo list or a habit tracker. It aggregates your real life data (study, English, fitness, coding, sleep, …) into one unified event stream and answers three questions:

1. **What have I done?** — Contribution Heatmap
2. **How much have I changed?** — Me vs Me
3. **Where do I go next?** — Goal Gap → Next Best Action

## Layout

```
compose.yaml        dev database — ONE postgres:17 container, 127.0.0.1:5432,
                    data bind-mounted at .data/postgres (sub2api-style)
apps/web            Next.js 16 + TypeScript + Tailwind v4 + shadcn/ui
apps/web/scripts    migrate.ts + seed.ts (tsx)
apps/api            FastAPI (M3)
packages/ui         Shared design system (M4)
packages/analytics  Aggregations / trends / gap math (M3)
packages/connectors GitHub / Anki / Apple Health / Hevy importers (M4)
database/migrations PostgreSQL DDL
docs                Architecture / design system / data model
```

## Getting started

**Container mode (sub2api-style, one command):**

```bash
npm run up          # build + start web + db in Docker (http://localhost:3000)
npm run seed        # first time: seed owner + 365-day history (idempotent)
```

**Dev mode (hot reload, DB in container only):**

```bash
npm install
npm run db:up       # start the postgres container
npm run db:migrate  # apply schema
npm run seed        # seed owner + history
npm run dev         # dev server with hot reload
```

## Scripts

```bash
npm run up          # docker compose up -d --build (web + api + db, full stack)
npm run down        # docker compose down (stop everything, data preserved)
npm run dev         # dev server on the host (http://localhost:3000)
npm run build       # production build (data routes are dynamic; DB not needed)
npm run start       # production server on the host (needs DB running)
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm run db:up       # start the postgres container only (data preserved)
npm run db:down     # stop the postgres container
npm run db:ui       # adminer at http://127.0.0.1:8081 (on demand)
npm run db:migrate  # apply pending migrations
npm run db:reset    # wipe + recreate + migrate + re-seed (destructive)
npm run seed        # seed the mock history (idempotent, never touches connector rows)
npm run api:up      # build + start the api container
npm run api:logs    # follow api logs
npm run sync        # sync every connector (needs credentials in apps/api/.env)
npm run sync:github # sync one connector
npm run sync:dry    # print what WOULD be written (no DB writes)
npm run insights    # generate the weekly AI insight (needs LLM_API_KEY)
npm run ticktick:auth  # one-time TickTick OAuth
npm run test:api    # pytest for the api (fixture-driven, no tokens needed)
```

## Status

- **M1 (done)**: UI — Home, Contribution, Me vs Me, Goals + design system.
- **M2 (done)**: database — one plain Postgres container (sub2api-style): users/events/goals/metrics/data_sources, seeded 365-day history, read path switched to the DB. Privacy = localhost-only binding + server-only credentials.
- **M3 (done)**: five-domain taxonomy (learning/english/coding/health/productivity), connector engine (GitHub + WeRead + Maimemo + TickTick — all official APIs), AI insights pipeline (DeepSeek, FACT/TREND/GAP/ACTION), real "today". Live syncs pending your credentials in `apps/api/.env`.
- **M4 (done)**: interaction gaps from the Master UI Prompt — Next Best Action (with reason), Heatmap Day Detail, Dashboard Header, Daily Goal ring, Data Sources page.
- **M5 (done)**: Decision Interface — NBA main card with Start timer → manual Event → loop re-derivation; Level badge + skill statuses; Insights 4-tab; theme switch (System/Dark/Light, default Dark).
- **M6 (next)**: Finance / Nutrition domains, Health page, more connectors.
