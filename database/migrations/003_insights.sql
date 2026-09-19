-- LifeOS M3 — AI insights storage.
-- `summary` is the auditable analytics input; `content` is the LLM output
-- {fact, trend, gap, action}. One row per (user, period, period_start) —
-- regeneration updates in place.

create table if not exists public.insights (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users (id) on delete cascade,
  period       text not null check (period in ('week', 'month')),
  period_start date not null,
  period_end   date not null,
  provider     text not null,
  model        text not null,
  summary      jsonb not null default '{}'::jsonb,
  content      jsonb not null,
  created_at   timestamptz not null default now(),
  constraint insights_unique_period unique (user_id, period, period_start)
);

create index if not exists insights_user_created_idx
  on public.insights (user_id, created_at desc);
