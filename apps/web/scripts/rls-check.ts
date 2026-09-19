/**
 * RLS smoke test — the ONLY test that exercises row level security, since
 * the app itself reads via the service role (which bypasses RLS).
 *
 * Phase 1: anon key → selecting events MUST return [] (HTTP 200, zero rows).
 * Phase 2: authenticated owner → MUST see the seeded row count.
 *
 * Run from the repo root via `npm run rls:check`.
 */

import { createClient } from "@supabase/supabase-js";

const EMAIL = process.env.SEED_OWNER_EMAIL ?? "owner@lifeos.local";
const PASSWORD = process.env.SEED_OWNER_PASSWORD ?? "lifeos-local-dev";

async function main() {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("missing SUPABASE_URL / SUPABASE_ANON_KEY");

  // Phase 1 — anon must see nothing (no policy for anon anywhere).
  const anonClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: anonRows, error: anonError } = await anonClient.from("events").select("event_id").limit(5);
  if (anonError) {
    // An error (rather than an empty array) would signal a GRANT problem,
    // not a policy problem — Supabase's defaults grant table access and
    // RLS is what returns zero rows.
    console.error("FAIL  anon query errored (grants problem?):", anonError.message);
    process.exit(1);
  }
  const anonOk = Array.isArray(anonRows) && anonRows.length === 0;
  console.log(`${anonOk ? "PASS" : "FAIL"}  anon sees ${anonRows.length} rows (expected 0)`);

  // Phase 2 — the owner must see the seeded rows.
  const ownerClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: signIn, error: signInError } = await ownerClient.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });
  if (signInError) throw signInError;
  console.log(`owner signed in: ${signIn.user.id}`);

  const { count, error: countError } = await ownerClient
    .from("events")
    .select("*", { count: "exact", head: true });
  if (countError) throw countError;
  const ownerOk = (count ?? 0) > 2000;
  console.log(`${ownerOk ? "PASS" : "FAIL"}  owner sees ${count} rows (expected >2000)`);

  const { data: metrics, error: metricsError } = await ownerClient.from("metrics").select("metric");
  if (metricsError) throw metricsError;
  console.log(`catalog readable: ${metrics.length} metrics`);

  process.exit(anonOk && ownerOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
