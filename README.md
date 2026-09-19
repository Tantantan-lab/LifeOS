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

```bash
npm install
npm run db:up       # start the postgres container (first run pulls the image)
npm run db:migrate  # apply schema
npm run seed        # seed owner + import the 365-day history (idempotent)
npm run dev         # dev server (http://localhost:3000)
```

## Scripts

```bash
npm run dev        # dev server (http://localhost:3000)
npm run build      # production build (data routes are dynamic; DB not needed)
npm run start      # production server (needs DB running)
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run db:up      # start the postgres container (data preserved)
npm run db:down    # stop the postgres container
npm run db:ui      # adminer at http://127.0.0.1:8081 (on demand)
npm run db:migrate # apply pending migrations
npm run db:reset   # wipe + recreate + migrate + re-seed (destructive)
npm run seed       # seed owner + events (idempotent)
```

## Status

- **M1 (done)**: UI — Home, Contribution, Me vs Me, Goals + design system.
- **M2 (done)**: database — one plain Postgres container (sub2api-style): users/events/goals/metrics/data_sources, seeded 365-day history, read path switched to the DB. Privacy = localhost-only binding + server-only credentials.
- **M3 (next)**: manual input + FastAPI analytics API.
- **M4+**: Connectors (GitHub, Health, Calendar, Vocabulary), AI insights, PWA.
