/**
 * LifeOS M2 read path — the event stream lives in Postgres (one Docker
 * container, sub2api-style). Server-only by construction: importing
 * `connection()` from next/server makes any client-component import of
 * this file a build-time error, and DATABASE_URL lacks the NEXT_PUBLIC_
 * prefix so it can never reach the client bundle.
 *
 * Privacy is a deployment property: the database binds to 127.0.0.1
 * only (compose.yaml) and only this server-side code holds credentials.
 * Single user — `resolveOwnerUserId` reads the one seeded users row.
 */

import "server-only";
import { connection } from "next/server";
import { Pool } from "pg";
import { USER_ID } from "@/data/constants";
import {
  DEMO_DATA_SOURCES,
  DEMO_INSIGHTS,
  DEMO_INSIGHT_META,
  getDemoEvents,
} from "@/data/demo-data";
import { DEMO_MODE } from "@/lib/demo";
import type { InsightRecord, LifeEvent, Domain } from "@/data/types";

let pool: Pool | null = null;

function db(): Pool {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "missing DATABASE_URL — run `npm run db:up` and check apps/web/.env.local"
    );
  }
  pool = new Pool({ connectionString: url, max: 5 });
  return pool;
}

/** Single-user M2: the one seeded owner row. */
export async function resolveOwnerUserId(): Promise<string> {
  if (DEMO_MODE) return USER_ID; // demo: the mock owner, no DB
  await connection();
  const { rows } = await db().query(
    "select id from users order by created_at asc limit 1"
  );
  if (rows.length === 0) throw new Error("no owner user found — run `npm run seed`");
  return rows[0].id as string;
}

interface DbEventRow {
  event_id: string;
  user_id: string;
  local_date: string;
  local_time: string;
  domain: Domain;
  metric: string;
  value: string | number;
  unit: string;
  source: LifeEvent["source"];
  confidence: string | number;
  metadata: Record<string, string | number | boolean> | null;
}

async function fetchAllEvents(userId: string): Promise<LifeEvent[]> {
  await connection();
  const { rows } = await db().query(
    `select event_id, user_id, local_date::text as local_date, local_time,
            domain, metric, value, unit, source, confidence, metadata
       from events
      where user_id = $1
      order by timestamp asc, event_id asc`,
    [userId]
  );
  return (rows as DbEventRow[]).map(toLifeEvent);
}

/**
 * Reconstruct the M1-identical timestamp string from local_date +
 * local_time (+08:00). This removes all timezone math from the app:
 * a 07:30+08:00 wake event is stored as 23:30Z UTC but must render as
 * 07:30 on the wake date — which is exactly what the trigger-derived
 * local fields preserve.
 */
function toLifeEvent(r: DbEventRow): LifeEvent {
  return {
    event_id: r.event_id,
    user_id: r.user_id,
    timestamp: `${r.local_date}T${r.local_time}:00+08:00`,
    local_date: r.local_date,
    domain: r.domain,
    metric: r.metric,
    value: Number(r.value),
    unit: r.unit,
    source: r.source,
    confidence: Number(r.confidence),
    metadata: r.metadata ?? {},
  };
}

/** Connector registry + sync status + trailing-30d event counts. */
const CONNECTOR_SOURCES = new Set(["github", "weread", "maimemo", "ticktick"]);

export async function getDataSources(): Promise<
  import("@/data/types").DataSourceRow[]
> {
  if (DEMO_MODE) return DEMO_DATA_SOURCES;
  await connection();
  const userId = await resolveOwnerUserId();
  const { rows } = await db().query(
    `select ds.source, ds.label, ds.connected, ds.last_sync_at,
            (select count(*)::int from events e
              where e.user_id = ds.user_id and e.source = ds.source
                and e.local_date >= current_date - 30) as events30
       from data_sources ds
      where ds.user_id = $1
      order by ds.source`,
    [userId]
  );
  return rows.map((r) => ({
    source: r.source,
    label: r.label,
    connected: r.connected,
    lastSyncAt: r.last_sync_at ? new Date(r.last_sync_at).toISOString() : null,
    events30d: r.events30,
    isConnector: CONNECTOR_SOURCES.has(r.source),
  }));
}

/**
 * Manual logging — the closing link of the decision loop (the NBA timer).
 * The events trigger derives local_date/local_time from the instant.
 */
export async function insertManualEvent(input: {
  metric: string;
  domain: Domain;
  minutes: number;
  metadata?: Record<string, string | number | boolean>;
}): Promise<void> {
  await connection();
  const userId = await resolveOwnerUserId();
  const eventId = `manual:${input.metric}:${Date.now()}`;
  await db().query(
    `insert into events (event_id, user_id, timestamp, domain, metric, value, unit, source, confidence, metadata)
     values ($1, $2, $3, $4, $5, $6, 'min', 'manual', 1.0, $7)`,
    [
      eventId,
      userId,
      new Date().toISOString(),
      input.domain,
      input.metric,
      input.minutes,
      JSON.stringify(input.metadata ?? {}),
    ]
  );
  // selectors.invalidateEventIndex() (called by logSession) drops the
  // index cache — the next render re-reads the stream.
}

/** Latest stored AI insight for a period (null = not generated yet). */
export async function getLatestInsight(
  period: "week" | "month"
): Promise<InsightRecord | null> {
  if (DEMO_MODE) return DEMO_INSIGHTS[period]; // snapshot, no DB
  await connection();
  const userId = await resolveOwnerUserId();
  const { rows } = await db().query(
    `select period, period_start::text as period_start, period_end::text as period_end,
            provider, model, created_at, content
       from insights
      where user_id = $1 and period = $2
      order by period_start desc
      limit 1`,
    [userId, period]
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    period: r.period,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    provider: r.provider,
    model: r.model,
    createdAt: new Date(r.created_at).toISOString(),
    content: r.content,
  };
}

/** Latest insight's meta (any period) — carries Jev's editorial picks,
 * e.g. meta.top = the header's "clearest trend" domain choice. */
export async function getLatestInsightMeta(): Promise<Record<string, unknown> | null> {
  if (DEMO_MODE) return DEMO_INSIGHT_META;
  await connection();
  const userId = await resolveOwnerUserId();
  const { rows } = await db().query(
    `select meta
       from insights
      where user_id = $1
      order by created_at desc, period desc
      limit 1`,
    [userId]
  );
  if (rows.length === 0) return null;
  return (rows[0].meta as Record<string, unknown>) ?? null;
}

/**
 * No cache here: the selectors-level event index is the single dedup
 * point (60s TTL there), and scheduled connector syncs write to Postgres
 * out-of-band — a cached read would show stale data for the server's
 * lifetime (the M2 production cache did exactly that).
 */
export function getEvents(): Promise<LifeEvent[]> {
  // Demo: the deterministic generator IS the event stream — no DB at all.
  if (DEMO_MODE) return Promise.resolve(getDemoEvents());
  const userId = resolveOwnerUserId();
  return userId.then(fetchAllEvents);
}
