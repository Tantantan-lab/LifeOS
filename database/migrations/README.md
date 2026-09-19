# Migrations

Supabase/Postgres DDL lands here in **M2**:

- `events` (unified event stream)
- `goals` (per-domain daily/weekly targets)
- `metrics` (metric catalog)
- `data_sources` (connector registry + credentials)

Row Level Security: **private by default** — every row visible only to its `user_id`.
