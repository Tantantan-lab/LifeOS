-- LifeOS M3 — five-domain taxonomy (learning/english/coding/health/productivity)
-- plus the connector provenance invariant.
--
-- Migration semantics: the runner (scripts/migrate.ts) wraps each file in one
-- transaction; this file is re-runnable only via the schema_migrations guard.
-- Domain renames must be UPDATEs, not CHECK edits alone.

-- 1) drop the auto-named domain CHECKs by introspection (safe within the txn)
do $$
declare c record;
begin
  for c in
    select con.conname, rel.relname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace n on n.oid = rel.relnamespace
     where n.nspname = 'public'
       and rel.relname in ('events', 'goals', 'metrics')
       and con.contype = 'c'
       and pg_get_constraintdef(con.oid) ilike '%domain%'
  loop
    execute format('alter table public.%I drop constraint %I', c.relname, c.conname);
  end loop;
end $$;

-- 2) domain renames
update public.metrics set domain = 'learning' where domain = 'study';
update public.metrics set domain = 'health'   where domain in ('sleep', 'fitness');
update public.goals   set domain = 'learning' where domain = 'study';
update public.goals   set domain = 'health'   where domain in ('sleep', 'fitness');
update public.events  set domain = 'learning' where domain = 'study';
update public.events  set domain = 'health'   where domain in ('sleep', 'fitness');

-- 3) metric renames — metrics.metric is referenced ON UPDATE CASCADE, so
--    events.metric and goals.metric follow automatically.
update public.metrics set metric = 'learning.study.minutes',   label = 'Study time'       where metric = 'study_minutes';
update public.metrics set metric = 'english.words.reviewed',   label = 'Words reviewed'   where metric = 'vocabulary_review';
update public.metrics set metric = 'english.minutes',          label = 'English practice' where metric = 'english_minutes';
update public.metrics set metric = 'english.ielts.mock.band',  label = 'IELTS mock'       where metric = 'ielts_mock_band';
update public.metrics set metric = 'coding.commits',           label = 'Commits'          where metric = 'coding_commits';
update public.metrics set metric = 'coding.minutes',           label = 'Coding'           where metric = 'coding_minutes';
update public.metrics set metric = 'health.workout.session',   label = 'Workout'          where metric = 'workout_session';
update public.metrics set metric = 'health.sleep.minutes',     label = 'Sleep'            where metric = 'sleep_minutes';

-- 4) new catalog rows: connector-owned + reserved slots from the user's
--    normalizer diagram.
insert into public.metrics (metric, domain, label, unit, value_kind, aggregation) values
  ('learning.reading.minutes',  'learning',     'Reading (WeRead)', 'min',   'minutes', 'sum'),
  ('learning.video.minutes',    'learning',     'Video',            'min',   'minutes', 'sum'),
  ('productivity.tasks.completed', 'productivity', 'Tasks completed', 'tasks', 'count', 'sum'),
  ('productivity.focus.minutes','productivity', 'Focus time',       'min',   'minutes', 'sum')
on conflict (metric) do update set label = excluded.label, domain = excluded.domain;

-- 5) re-add the CHECKs with the canonical domain set
alter table public.metrics add constraint metrics_domain_check
  check (domain in ('learning', 'english', 'coding', 'health', 'productivity'));
alter table public.goals   add constraint goals_domain_check
  check (domain in ('learning', 'english', 'coding', 'health', 'productivity'));
alter table public.events  add constraint events_domain_check
  check (domain in ('learning', 'english', 'coding', 'health', 'productivity'));

-- 6) separate mock provenance from real connectors.
--    Mock history is a placeholder (source='demo'); real connector rows must
--    never be touched by the seed (its delete filters source='demo').
update public.events set source = 'demo'
 where source = 'github' and event_id not like 'conn:%';

-- 7) connector invariant: exactly one row per (user, domain, metric, day, source)
--    for CONNECTOR rows. The event_id prefix is the provenance discriminator:
--    mock rows are `{date}:{domain}:{metric}:{seq}` (a day can hold several
--    sessions), connector rows are `conn:{source}:{metric}:{date}`.
create unique index if not exists events_connector_daily_uniq
  on public.events (user_id, domain, metric, local_date, source)
  where event_id like 'conn:%';
