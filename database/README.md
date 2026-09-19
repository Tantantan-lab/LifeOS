# LifeOS Database

**One plain PostgreSQL 17 container** (sub2api-style) — no auth system, no
API gateway. Single user by design.

- Image/ports/volume: `../compose.yaml` — binds to `127.0.0.1:5432` ONLY
  (privacy is a deployment property), data bind-mounted at `../.data/postgres`
  so backup/migration is a plain file copy.
- DDL: `migrations/*.sql`, applied in filename order by
  `apps/web/scripts/migrate.ts` (tracked in `schema_migrations`).

## Daily commands (from repo root)

```bash
npm run db:up       # start the container (data preserved across restarts)
npm run db:down     # stop the container
npm run db:ui       # adminer on http://127.0.0.1:8081 (on demand)
npm run db:migrate  # apply pending migrations
npm run db:reset    # wipe + recreate + migrate + re-seed (destructive)
npm run seed        # seed owner + 365-day dataset (idempotent)
```

## Schema (M2)

- `users` — the single owner row
- `events` — the unified event stream; `local_date`/`local_time` are
  trigger-derived from `timestamp` (Asia/Shanghai)
- `goals` — per-domain targets (written by seed, read by the app in M3)
- `metrics` — global metric catalog (events.metric FKs it)
- `data_sources` — connector registry
