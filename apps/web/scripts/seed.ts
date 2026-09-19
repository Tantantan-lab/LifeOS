/**
 * LifeOS seed — creates the owner auth user, upserts the catalogs
 * (profiles / metrics / data_sources / goals) and imports the full
 * deterministic 365-day event dataset from src/data/generator.ts.
 *
 * Idempotent: delete-then-insert per owner; safe to run repeatedly.
 * Run from the repo root via `npm run seed` (cwd = apps/web, so the
 * `@/` tsconfig paths resolve).
 *
 * NOTE: events.local_date / local_time are NOT inserted here — the
 * `events_set_local_fields` trigger derives them from the timestamp.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { generateEvents } from "@/data/generator";
import { SOURCE_LABELS } from "@/lib/copy";

const CHUNK = 500;
const EMAIL = process.env.SEED_OWNER_EMAIL ?? "owner@lifeos.local";
const PASSWORD = process.env.SEED_OWNER_PASSWORD ?? "lifeos-local-dev";

const METRIC_ROWS = [
  { metric: "study_minutes", domain: "study", label: "Study", unit: "min", value_kind: "minutes", aggregation: "sum" },
  { metric: "vocabulary_review", domain: "english", label: "Vocabulary review", unit: "words", value_kind: "count", aggregation: "sum" },
  { metric: "english_minutes", domain: "english", label: "English practice", unit: "min", value_kind: "minutes", aggregation: "sum" },
  { metric: "ielts_mock_band", domain: "english", label: "IELTS mock", unit: "band", value_kind: "band", aggregation: "last" },
  { metric: "workout_session", domain: "fitness", label: "Workout", unit: "session", value_kind: "session", aggregation: "sum" },
  { metric: "coding_commits", domain: "coding", label: "Commits", unit: "commits", value_kind: "count", aggregation: "sum" },
  { metric: "coding_minutes", domain: "coding", label: "Coding", unit: "min", value_kind: "minutes", aggregation: "sum" },
  { metric: "sleep_minutes", domain: "sleep", label: "Sleep", unit: "min", value_kind: "minutes", aggregation: "avg" },
] as const;

const GOAL_ROWS = [
  { domain: "study", metric: "study_minutes", period: "day", target_value: 120, label: "120 min/day" },
  { domain: "english", metric: "vocabulary_review", period: "day", target_value: 40, label: "40 words/day" },
  { domain: "fitness", metric: "workout_session", period: "week", target_value: 3, label: "3 sessions/week" },
  { domain: "coding", metric: "coding_commits", period: "week", target_value: 10, label: "10 commits/week" },
  { domain: "sleep", metric: "sleep_minutes", period: "day", target_value: 420, target_min: 390, target_max: 450, label: "6.5–7.5h band" },
] as const;

async function ensureOwner(db: SupabaseClient): Promise<string> {
  const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw error;
  const hit = data.users.find((u) => u.email === EMAIL);
  if (hit) {
    console.log(`owner exists: ${hit.id}`);
    return hit.id;
  }
  const { data: created, error: createError } = await db.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (createError) throw createError;
  console.log(`owner created: ${created.user.id}`);
  return created.user.id;
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — copy apps/web/.env.example to .env.local and run `npm run db:start`"
    );
  }
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const ownerId = await ensureOwner(db);

  // 1. catalogs (events.metric FKs metrics.metric — must exist first)
  const { error: profileError } = await db.from("profiles").upsert({
    id: ownerId,
    email: EMAIL,
    display_name: "Local Owner",
    timezone: "Asia/Shanghai",
  });
  if (profileError) throw profileError;

  const { error: metricsError } = await db.from("metrics").upsert(METRIC_ROWS, { onConflict: "metric" });
  if (metricsError) throw metricsError;

  const sourceRows = Object.keys(SOURCE_LABELS).map((source) => ({
    user_id: ownerId,
    source,
    label: SOURCE_LABELS[source as keyof typeof SOURCE_LABELS],
  }));
  const { error: sourcesError } = await db.from("data_sources").upsert(sourceRows, { onConflict: "user_id,source" });
  if (sourcesError) throw sourcesError;

  const goalRows = GOAL_ROWS.map((g) => ({
    user_id: ownerId,
    domain: g.domain,
    metric: g.metric,
    period: g.period,
    target_value: g.target_value,
    target_min: "target_min" in g ? g.target_min : null,
    target_max: "target_max" in g ? g.target_max : null,
    label: g.label,
  }));
  const { error: goalsError } = await db.from("goals").upsert(goalRows, { onConflict: "user_id,domain,metric,period" });
  if (goalsError) throw goalsError;

  // 2. events: delete-then-insert per owner (idempotent)
  const events = generateEvents();
  const { error: deleteError } = await db.from("events").delete().eq("user_id", ownerId);
  if (deleteError) throw deleteError;

  for (let i = 0; i < events.length; i += CHUNK) {
    const rows = events.slice(i, i + CHUNK).map((e) => ({
      event_id: e.event_id,
      user_id: ownerId,
      timestamp: e.timestamp,
      domain: e.domain,
      metric: e.metric,
      value: e.value,
      unit: e.unit,
      source: e.source,
      confidence: e.confidence,
      metadata: e.metadata,
    }));
    const { error } = await db.from("events").insert(rows);
    if (error) throw error;
  }

  // 3. self-verify (count: exact, no .select() body → no max_rows involvement)
  const { count, error: countError } = await db
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", ownerId);
  if (countError) throw countError;
  console.log(`events: ${count} rows / ${events.length} generated`);
  if (count !== events.length) throw new Error(`row count mismatch: ${count} !== ${events.length}`);
  console.log("seed complete");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
