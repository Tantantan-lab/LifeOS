-- LifeOS — TypeSafe insights provenance.
-- content keeps the four keys fact/trend/gap/action, each an {en, zh} pair
-- (the web reads content.fact.en / content.fact.zh); `meta` carries the
-- selection audit trail: candidate options, Jev's chosen key,
-- probabilities, confidence, model and usage.
alter table public.insights add column if not exists meta jsonb not null default '{}'::jsonb;
