/**
 * LifeOS seed — creates the single owner user, upserts the catalogs
 * (metrics / data_sources / goals) and imports the full deterministic
 * 365-day event dataset from src/data/generator.ts.
 *
 * Idempotent: delete-then-insert per owner; safe to run repeatedly.
 * Run from the repo root via `npm run seed` (cwd = apps/web, so the
 * `@/` tsconfig paths resolve).
 *
 * NOTE: events.local_date / local_time are NOT inserted here — the
 * `events_set_local_fields` trigger derives them from the timestamp.
 */

import { Pool } from "pg";
import { generateEvents } from "@/data/generator";
import { SOURCE_LABELS } from "@/lib/copy";

const CHUNK = 500;
const OWNER_EMAIL = "owner@lifeos.local";

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

/** Upsert-or-reuse the single owner (no auth system — one row, always). */
async function ensureOwner(pool: Pool): Promise<string> {
  const { rows } = await pool.query(
    `insert into users (email, display_name)
     values ($1, 'Local Owner')
     on conflict (email) do update set display_name = users.display_name
     returning id`,
    [OWNER_EMAIL]
  );
  return rows[0].id as string;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "missing DATABASE_URL — copy apps/web/.env.example to .env.local and run `npm run db:up`"
    );
  }
  const pool = new Pool({ connectionString: url });

  const ownerId = await ensureOwner(pool);
  console.log(`owner: ${ownerId}`);

  // 1. catalogs (events.metric FKs metrics.metric — must exist first)
  for (const m of METRIC_ROWS) {
    await pool.query(
      `insert into metrics (metric, domain, label, unit, value_kind, aggregation)
       values ($1,$2,$3,$4,$5,$6)
       on conflict (metric) do update set label = excluded.label`,
      [m.metric, m.domain, m.label, m.unit, m.value_kind, m.aggregation]
    );
  }

  for (const [source, label] of Object.entries(SOURCE_LABELS)) {
    await pool.query(
      `insert into data_sources (user_id, source, label)
       values ($1,$2,$3)
       on conflict (user_id, source) do update set label = excluded.label`,
      [ownerId, source, label]
    );
  }

  for (const g of GOAL_ROWS) {
    await pool.query(
      `insert into goals (user_id, domain, metric, period, target_value, target_min, target_max, label)
       values ($1,$2,$3,$4,$5,$6,$7,$8)
       on conflict (user_id, domain, metric, period) do update set
         target_value = excluded.target_value,
         target_min = excluded.target_min,
         target_max = excluded.target_max,
         label = excluded.label`,
      [ownerId, g.domain, g.metric, g.period, g.target_value, "target_min" in g ? g.target_min : null, "target_max" in g ? g.target_max : null, g.label]
    );
  }

  // 2. events: delete-then-insert per owner (idempotent)
  const events = generateEvents();
  await pool.query("delete from events where user_id = $1", [ownerId]);

  const COLS = 10; // event_id,user_id,timestamp,domain,metric,value,unit,source,confidence,metadata
  for (let i = 0; i < events.length; i += CHUNK) {
    const chunk = events.slice(i, i + CHUNK);
    const values: string[] = [];
    const params: unknown[] = [];
    chunk.forEach((e, j) => {
      const b = j * COLS;
      values.push(`($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9},$${b + 10})`);
      params.push(
        e.event_id, ownerId, e.timestamp, e.domain, e.metric,
        e.value, e.unit, e.source, e.confidence, JSON.stringify(e.metadata)
      );
    });
    await pool.query(
      `insert into events (event_id, user_id, timestamp, domain, metric, value, unit, source, confidence, metadata)
       values ${values.join(",")}`,
      params
    );
  }

  // 3. self-verify
  const { rows } = await pool.query("select count(*)::int as n from events where user_id = $1", [ownerId]);
  const count = rows[0].n;
  console.log(`events: ${count} rows / ${events.length} generated`);
  if (count !== events.length) throw new Error(`row count mismatch: ${count} !== ${events.length}`);
  console.log("seed complete");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
