# LifeOS Database

PostgreSQL via **local Supabase** (Docker). Auth + RLS + PostgREST + Studio
come free with the stack; the database itself is plain Postgres 17.

## Where the DDL lives

`../supabase/migrations/` — timestamp-named SQL files, applied by
`npm run db:reset` (which re-seeds) or `npx supabase migration up`.

`database/migrations/` (the old M1 placeholder) was removed — one canonical
location, matching the Supabase CLI convention.

## Daily commands (from repo root)

```bash
npm run db:start    # start the stack (first run pulls images)
npm run db:stop     # stop WITHOUT wiping (backs up)
npm run db:status   # URLs + keys (`-o env` for shell export)
npm run db:reset    # re-apply migrations + re-seed (destructive)
npm run seed        # create owner + import the 365-day dataset (idempotent)
npm run rls:check   # RLS smoke test: anon sees 0 rows, owner sees all
```

⚠️ `supabase stop --no-backup` **wipes local data** — prefer `npm run db:stop`
or just leave the stack running.

## Schema (M2)

- `profiles` — per-user profile (→ auth.users)
- `events` — the unified event stream; `local_date`/`local_time` are
  trigger-derived from `timestamp` (Asia/Shanghai)
- `goals` — per-domain targets (written by seed, read by the app in M3)
- `metrics` — global metric catalog (events.metric FKs it)
- `data_sources` — per-user connector registry

RLS is enabled everywhere: **private by default** — anon sees nothing,
authenticated users see only their own rows.
