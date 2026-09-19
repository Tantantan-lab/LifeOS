/**
 * LifeOS M2 read path — the event stream now lives in Postgres (local
 * Supabase). Server-only by construction: importing `connection()` from
 * next/server makes any client-component import of this file a
 * build-time error, and SUPABASE_SERVICE_ROLE_KEY lacks the
 * NEXT_PUBLIC_ prefix so it can never reach the client bundle.
 *
 * M2 reads via the service role (which bypasses RLS) on the seeded
 * owner profile. M3 swaps `resolveOwnerUserId` for the auth session
 * (supabase-ssr + JWT) — RLS policies are already in place.
 */

import "server-only";
import { connection } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { LifeEvent, Domain } from "@/data/types";
import { DOMAIN_META } from "@/data/constants";

let client: SupabaseClient | null = null;

function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — run `npm run db:start` and check apps/web/.env.local"
    );
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** Single-user M2: the seeded owner profile. M3 replaces with the auth session. */
export async function resolveOwnerUserId(): Promise<string> {
  await connection();
  const { data, error } = await db()
    .from("profiles")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("no owner profile found — run `npm run seed`");
  return data.id;
}

interface DbEventRow {
  event_id: string;
  user_id: string;
  timestamp: string;
  local_date: string;
  local_time: string;
  domain: Domain;
  metric: string;
  value: number | string;
  unit: string;
  source: LifeEvent["source"];
  confidence: number | string;
  metadata: Record<string, string | number | boolean> | null;
}

/**
 * Page size must stay <= config.toml [api] max_rows (10000). PostgREST
 * truncates SILENTLY at max_rows — a short read would corrupt every
 * number in the UI with zero errors — so we paginate explicitly.
 */
const PAGE = 1000;

async function fetchAllEvents(userId: string): Promise<LifeEvent[]> {
  await connection();
  const rows: DbEventRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db()
      .from("events")
      .select(
        "event_id,user_id,timestamp,local_date,local_time,domain,metric,value,unit,source,confidence,metadata"
      )
      .eq("user_id", userId)
      .order("timestamp", { ascending: true })
      .order("event_id", { ascending: true }) // deterministic total order → safe paging
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data as DbEventRow[]));
    if (data.length < PAGE) break; // short page = last page
  }
  return rows.map(toLifeEvent).sort(m1EventOrder);
}

/**
 * Reconstruct the byte-identical M1 timestamp string from local_date +
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

/** M1 generation order: timestamp → domain rank → event_id seq → metric. */
function m1EventOrder(a: LifeEvent, b: LifeEvent): number {
  if (a.timestamp !== b.timestamp) return a.timestamp < b.timestamp ? -1 : 1;
  const rank = (e: LifeEvent) => Object.keys(DOMAIN_META).indexOf(e.domain);
  if (rank(a) !== rank(b)) return rank(a) - rank(b);
  if (a.event_id !== b.event_id) return a.event_id < b.event_id ? -1 : 1;
  return 0;
}

/**
 * Module-scope cache: one query per server instance in production;
 * re-seeding becomes visible within ~1s in dev. A failed load never
 * poisons the cache.
 */
let cache: { at: number; p: Promise<LifeEvent[]> } | null = null;
const TTL = process.env.NODE_ENV === "production" ? Number.POSITIVE_INFINITY : 1000;

export function getEvents(): Promise<LifeEvent[]> {
  const now = Date.now();
  if (cache && now - cache.at < TTL) return cache.p;
  const p = (async () => {
    const userId = await resolveOwnerUserId();
    return fetchAllEvents(userId);
  })().catch((e) => {
    cache = null;
    throw e;
  });
  cache = { at: now, p };
  return p;
}
