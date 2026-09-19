-- LifeOS M2 — unified event stream + catalog + connector registry.
-- Single-user by design: one `users` row, no auth system. Privacy is a
-- deployment property — the database binds to 127.0.0.1 only (compose.yaml)
-- and only the server-side app has credentials.

-- ---------------------------------------------------------------- users
create table public.users (
  id           uuid primary key default gen_random_uuid(),
  email        text unique not null,
  display_name text,
  timezone     text not null default 'Asia/Shanghai',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------- metrics (global catalog)
create table public.metrics (
  metric      text primary key,
  domain      text not null check (domain in ('study','english','fitness','coding','sleep')),
  label       text not null,
  unit        text not null,
  value_kind  text not null default 'count' check (value_kind in ('count','minutes','band','session')),
  aggregation text not null default 'sum'   check (aggregation in ('sum','avg','last','max')),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- data_sources (registry)
create table public.data_sources (
  user_id      uuid not null references public.users (id) on delete cascade,
  source       text not null,
  label        text not null,
  enabled      boolean not null default true,
  connected    boolean not null default false,
  last_sync_at timestamptz,
  config       jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  primary key (user_id, source)
);

-- ---------------------------------------------------------------- goals
create table public.goals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users (id) on delete cascade,
  domain       text not null check (domain in ('study','english','fitness','coding','sleep')),
  metric       text not null references public.metrics (metric) on update cascade,
  period       text not null default 'day' check (period in ('day','week','month')),
  target_value numeric(12,4) not null,
  target_min   numeric(12,4),          -- sleep band lower bound (390 min)
  target_max   numeric(12,4),          -- sleep band upper bound (450 min)
  label        text not null,          -- "120 min/day"
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, domain, metric, period)
);

-- ---------------------------------------------------------------- events (the unified stream)
create table public.events (
  event_id   text primary key default (gen_random_uuid())::text,
  user_id    uuid not null references public.users (id) on delete cascade,
  timestamp  timestamptz not null,                      -- the instant
  local_date date not null,                             -- attributed calendar date (+08:00)
  local_time text not null check (local_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  domain     text not null check (domain in ('study','english','fitness','coding','sleep')),
  metric     text not null references public.metrics (metric) on update cascade,
  value      numeric(12,4) not null,                    -- ielts bands are x.5
  unit       text not null,
  source     text not null,                             -- deliberately NOT FK'd: provenance only,
                                                         -- ingestion must never drop data points because
                                                         -- a registry row is missing (new sources must
                                                         -- not require a schema change).
  confidence numeric(3,2) not null check (confidence >= 0 and confidence <= 1),
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index events_user_local_date_idx        on public.events (user_id, local_date);
create index events_user_domain_local_date_idx on public.events (user_id, domain, local_date);
create index events_user_metric_local_date_idx on public.events (user_id, metric, local_date);

-- local_date / local_time are DERIVED from the instant: one source of truth, and
-- an inconsistent row cannot be written (M3 manual entry gets this for free).
-- Not a GENERATED column: timezone(text, timestamptz) is only STABLE, and
-- generated columns / CHECK constraints require IMMUTABLE expressions.
create or replace function public.events_set_local_fields()
returns trigger language plpgsql as $$
begin
  new.local_date := (new.timestamp at time zone 'Asia/Shanghai')::date;
  new.local_time := to_char(new.timestamp at time zone 'Asia/Shanghai', 'HH24:MI');
  return new;
end $$;

create trigger events_set_local_fields
  before insert or update of timestamp on public.events
  for each row execute function public.events_set_local_fields();
