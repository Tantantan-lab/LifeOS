-- LifeOS: finance domain for Longbridge (长桥) P&L tracking.
-- P&L is SIGNED (positive = profit, negative = loss) — a different
-- encoding from completion metrics, handled specially in selectors.

-- extend domain CHECKs
do $$
declare c record;
begin
  for c in
    select con.conname, rel.relname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace n on n.oid = rel.relnamespace
     where n.nspname = 'public'
       and rel.relname in ('events', 'metrics')
       and con.contype = 'c'
       and pg_get_constraintdef(con.oid) ilike '%domain%'
  loop
    execute format('alter table public.%I drop constraint %I', c.relname, c.conname);
  end loop;
end $$;

alter table public.events  add constraint events_domain_check
  check (domain in ('learning', 'english', 'coding', 'health', 'productivity', 'finance'));
alter table public.metrics add constraint metrics_domain_check
  check (domain in ('learning', 'english', 'coding', 'health', 'productivity', 'finance'));

insert into public.metrics (metric, domain, label, unit, value_kind, aggregation) values
  ('finance.pnl', 'finance', 'P&L', 'cny', 'count', 'last')
on conflict (metric) do update set label = excluded.label;
