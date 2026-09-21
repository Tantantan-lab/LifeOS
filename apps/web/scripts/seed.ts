/**
 * LifeOS seed — creates the single owner user, upserts the catalogs
 * (metrics / data_sources / goals) and imports the full deterministic
 * 365-day event dataset from scripts/generator.ts.
 *
 * Idempotent: delete-then-insert per owner; safe to run repeatedly.
 * Run from the repo root via `npm run seed` (cwd = apps/web, so the
 * `@/` tsconfig paths resolve).
 *
 * NOTE: events.local_date / local_time are NOT inserted here — the
 * `events_set_local_fields` trigger derives them from the timestamp.
 */

import { Pool } from "pg";
import { generateEvents } from "./generator";
import { SOURCE_LABELS } from "@/lib/copy";

const CHUNK = 500;
const OWNER_EMAIL = "owner@lifeos.local";

const METRIC_ROWS = [
  { metric: "learning.study.minutes", domain: "learning", label: "Study time", unit: "min", value_kind: "minutes", aggregation: "sum" },
  { metric: "learning.reading.minutes", domain: "learning", label: "Reading (WeRead)", unit: "min", value_kind: "minutes", aggregation: "sum" },
  { metric: "learning.video.minutes", domain: "learning", label: "Video", unit: "min", value_kind: "minutes", aggregation: "sum" },
  { metric: "english.words.reviewed", domain: "english", label: "Words reviewed", unit: "words", value_kind: "count", aggregation: "sum" },
  { metric: "english.minutes", domain: "english", label: "English practice", unit: "min", value_kind: "minutes", aggregation: "sum" },
  { metric: "english.ielts.mock.band", domain: "english", label: "IELTS mock", unit: "band", value_kind: "band", aggregation: "last" },
  { metric: "coding.commits", domain: "coding", label: "Commits", unit: "commits", value_kind: "count", aggregation: "sum" },
  { metric: "coding.minutes", domain: "coding", label: "Coding", unit: "min", value_kind: "minutes", aggregation: "sum" },
  { metric: "health.workout.session", domain: "health", label: "Workout", unit: "session", value_kind: "session", aggregation: "sum" },
  { metric: "health.sleep.minutes", domain: "health", label: "Sleep", unit: "min", value_kind: "minutes", aggregation: "avg" },
  { metric: "productivity.tasks.completed", domain: "productivity", label: "Tasks completed", unit: "tasks", value_kind: "count", aggregation: "sum" },
  { metric: "productivity.focus.minutes", domain: "productivity", label: "Focus time", unit: "min", value_kind: "minutes", aggregation: "sum" },
] as const;

const GOAL_ROWS = [
  { domain: "learning", metric: "learning.study.minutes", period: "day", target_value: 120, label: "120 min/day" },
  { domain: "learning", metric: "learning.reading.minutes", period: "day", target_value: 30, label: "30 min/day (soft)" },
  { domain: "english", metric: "english.words.reviewed", period: "day", target_value: 40, label: "40 words/day" },
  { domain: "coding", metric: "coding.commits", period: "week", target_value: 10, label: "10 commits/week" },
  { domain: "health", metric: "health.workout.session", period: "week", target_value: 3, label: "3 sessions/week" },
  { domain: "health", metric: "health.sleep.minutes", period: "day", target_value: 420, target_min: 390, target_max: 450, label: "6.5–7.5h band" },
  { domain: "productivity", metric: "productivity.tasks.completed", period: "week", target_value: 15, label: "15 tasks/week" },
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

  // 2. events: delete-then-insert the MOCK dataset only.
  //    event_id prefix is the provenance discriminator: mock rows are
  //    `{date}:{domain}:{metric}:{seq}`, connector rows are `conn:...` —
  //    a re-seed must NEVER wipe real connector data.
  const events = generateEvents();
  await pool.query("delete from events where event_id not like 'conn:%'");

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

  // 3. self-verify (mock rows only)
  const { rows } = await pool.query("select count(*)::int as n from events where event_id not like 'conn:%'");
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
