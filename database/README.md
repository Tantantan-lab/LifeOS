# LifeOS Database

PostgreSQL via Supabase (auth + RLS + storage). Arrives in **M2**.

Core principle: **one unified `Event` table** — every data source (GitHub, Apple Health, vocabulary app, manual entry) becomes the same row shape:

```
event_id  user_id  timestamp  domain  metric  value  unit  source  confidence  metadata
```

See `docs/data-model.md` and `migrations/` for DDL.
