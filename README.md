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
apps/web            Next.js 16 + TypeScript + Tailwind v4 + shadcn/ui
apps/api            FastAPI (M3)
packages/ui         Shared design system (M4)
packages/analytics  Aggregations / trends / gap math (M3)
packages/connectors GitHub / Anki / Apple Health / Hevy importers (M4)
database            PostgreSQL (Supabase) migrations (M2)
docs                Architecture / design system / data model
```

## Scripts

```bash
npm run dev        # dev server (http://localhost:3000)
npm run build      # production build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

## Status

- **M1 (current)**: UI — Home, Contribution, Me vs Me, Goals, driven by deterministic mock data behind an async selector layer.
- **M2 (next)**: Supabase database (User / Event / Goal / Metric / DataSource), manual input.
- **M3**: FastAPI analytics API, AI insights.
- **M4+**: Connectors (GitHub, Health, Calendar, Vocabulary), PWA.
