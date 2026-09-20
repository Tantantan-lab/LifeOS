-- LifeOS: workout duration metric for the Xunji (训记) connector.
insert into public.metrics (metric, domain, label, unit, value_kind, aggregation) values
  ('health.workout.minutes', 'health', 'Workout time', 'min', 'minutes', 'sum')
on conflict (metric) do update set label = excluded.label;
