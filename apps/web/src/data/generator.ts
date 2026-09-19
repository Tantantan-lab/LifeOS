/**
 * Deterministic event generator — one year of realistic data.
 *
 * Every per-day value derives from hash(SEED, domain, dateKey), so
 * generation is order-independent and past days never change.
 * Realism curves are documented per domain; see docs/data-model.md.
 *
 * M2: this is the single source of truth for the dataset — the seed
 * script (scripts/seed.ts) imports it into Postgres, and the web app
 * reads back from Postgres via src/data/db.ts. The two paths produce
 * byte-identical data.
 * M3: mock provenance is `source='demo'`; metric/domain names follow the
 * new taxonomy while streamKey stays frozen so the numbers never shift.
 */

import {
  MOCK_LAST_DATE,
  SEED,
  TIMEZONE_OFFSET,
  USER_ID,
} from "@/data/constants";
import type { Domain, LifeEvent, Source } from "@/data/types";
import { addDays, daysBetween, weekdayOf } from "@/lib/dates";
import {
  clamp,
  easeIn,
  easeOut,
  gaussian,
  pick,
  poisson,
  rngFor,
  uniform,
} from "@/data/rng";

const DAYS = 365;
/** daysAgo of each generated day: DAYS-1 … 0 (oldest → mock's last day). */
const FIRST_DATE = addDays(MOCK_LAST_DATE, -(DAYS - 1));

const STUDY_SUBJECTS = [
  "Operating Systems",
  "Networking",
  "Python",
  "Linux",
  "Docker",
  "Kubernetes",
] as const;

const WORKOUT_TYPES = ["Strength", "Running", "Swimming", "Cycling"] as const;
const REPOS = ["lifeos", "side-projects", "scripts", "notes"] as const;
const VOCAB_DECKS = ["IELTS core", "IELTS academic", "review"] as const;
const ENGLISH_ACTIVITIES = ["listening", "speaking"] as const;

/** Latest mock first (most recent value = last entry). */
const IELTS_BAND_WALK = [
  5.5, 5.5, 6.0, 5.5, 6.0, 6.0, 6.0, 6.0, 6.0, 6.0, 6.0, 6.0, 6.0, 6.5, 6.0, 6.0, 6.0, 6.0,
];

function hhmm(rng: () => number, from: number, to: number): string {
  const total = Math.floor(uniform(rng, from, to)); // minutes since midnight
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function makeEvent(
  dateKey: string,
  seq: number,
  domain: Domain,
  metric: string,
  value: number,
  unit: string,
  source: Source,
  confidence: number,
  time: string,
  metadata: Record<string, string | number | boolean> = {}
): LifeEvent {
  return {
    event_id: `${dateKey}:${domain}:${metric}:${seq}`,
    user_id: USER_ID,
    timestamp: `${dateKey}T${time}:00${TIMEZONE_OFFSET}`,
    local_date: dateKey,
    domain,
    metric,
    value,
    unit,
    source,
    confidence,
    metadata,
  };
}

/* ------------------------------------------------------------------ */
/* Per-domain generators                                              */
/* ------------------------------------------------------------------ */

function genStudy(dateKey: string, daysAgo: number, rng: () => number): LifeEvent[] {
  if (rng() < 0.08) return []; // ~8% rest days
  const progress90 = easeIn((90 - daysAgo) / 90); // 72 → 120 min spread over the last 90 days
  const fullYear = 0.06 * easeOut(1 - daysAgo / (DAYS - 1)); // slow year-long drift
  const weekend = weekdayOf(dateKey) === 0 || weekdayOf(dateKey) === 6;
  let minutes = (72 + 48 * progress90 + 6 * fullYear) * (weekend ? 0.55 : 1);
  minutes *= uniform(rng, 0.78, 1.22);
  minutes = Math.round(clamp(minutes, 20, 200));

  const sessions = rng() < 0.4 ? 2 : 1;
  const events: LifeEvent[] = [];
  let remaining = minutes;
  for (let s = 0; s < sessions; s++) {
    const part =
      s === sessions - 1
        ? remaining
        : Math.round(uniform(rng, 0.4, 0.7) * remaining);
    remaining -= part;
    events.push(
      makeEvent(dateKey, s, "learning", "learning.study.minutes", part, "min", "timer", 0.95, hhmm(rng, 19 * 60, 22 * 60 + 30), {
        subject: pick(rng, STUDY_SUBJECTS),
        session: s + 1,
      })
    );
  }
  return events;
}

function genEnglish(dateKey: string, daysAgo: number, rng: () => number): LifeEvent[] {
  const events: LifeEvent[] = [];
  const rest = rng() < 0.1; // ~10% rest days
  const progress180 = easeIn((180 - daysAgo) / 180); // 25 → 70 words/day spread over 180 days

  const words = rest
    ? 0
    : Math.round((30 + 35 * progress180) * uniform(rng, 0.7, 1.3));
  if (words > 0) {
    events.push(
      makeEvent(dateKey, 0, "english", "english.words.reviewed", clamp(words, 10, 90), "words", "anki", 0.95, hhmm(rng, 8 * 60, 9 * 60 + 30), {
        deck: pick(rng, VOCAB_DECKS),
      })
    );
  }

  // Listening / speaking practice, most days.
  if (rng() < 0.8) {
    const activity = pick(rng, ENGLISH_ACTIVITIES);
    events.push(
      makeEvent(dateKey, 1, "english", "english.minutes", Math.round(uniform(rng, 10, 45)), "min", "anki", 0.95, hhmm(rng, 20 * 60, 23 * 60), {
        activity,
      })
    );
  }

  // IELTS mock every ~21 days, walking 5.5 → 6.0 with a 6.5 spike.
  const mockIndex = Math.floor(daysAgo / 21); // 0 … 17
  if (daysAgo % 21 === 0 && mockIndex < IELTS_BAND_WALK.length) {
    const band = IELTS_BAND_WALK[IELTS_BAND_WALK.length - 1 - mockIndex];
    events.push(
      makeEvent(dateKey, 2, "english", "english.ielts.mock.band", band, "band", "manual", 1, "10:00", {
        l: band + 0.5,
        r: band,
        w: band - 0.5,
        s: band,
      })
    );
  }
  return events;
}

function genFitness(dateKey: string, daysAgo: number, rng: () => number): LifeEvent[] {
  // 2.0 → 2.8 sessions/week over 180 days. Sessions land on preferred
  // weekday slots (Mon/Tue/Thu/Sat) with a per-slot probability, plus rare
  // off-slot extras — a real training schedule. This keeps window-to-window
  // noise far below a uniform daily coin flip (a 30d window is only ~11
  // sessions; flip noise was ±40%, burying the trend).
  const weeklyMean = 2.0 + 0.8 * easeIn((180 - daysAgo) / 180);
  const weekday = weekdayOf(dateKey);
  const isSlot = [1, 2, 4, 6].includes(weekday); // Mon, Tue, Thu, Sat
  const p = isSlot ? Math.min(0.85, weeklyMean / 4) : 0.06;
  if (rng() >= p) return [];

  const events: LifeEvent[] = [];
  const n = rng() < 0.05 ? 2 : 1; // occasional 2-a-day
  for (let s = 0; s < n; s++) {
    const duration = Math.round(uniform(rng, 35, 70));
    events.push(
      makeEvent(dateKey, s, "health", "health.workout.session", 1, "session", "hevy", 0.95, hhmm(rng, 18 * 60, 21 * 60), {
        type: pick(rng, WORKOUT_TYPES),
        duration_min: duration,
      })
    );
  }
  return events;
}

function genCoding(dateKey: string, daysAgo: number, rng: () => number): LifeEvent[] {
  // 6 commits/week at the start of the year → 13 commits/week now.
  const weeklyMean = 6 + 7 * easeIn((275 - daysAgo) / 275);
  const commits = poisson(rng, weeklyMean / 7);
  if (commits === 0) return [];

  const events: LifeEvent[] = [];
  const sessions = Math.min(
    rng() < 0.35 ? 2 : rng() < 0.15 ? 3 : 1,
    commits // never split into a 0-commit session
  );
  let remainingCommits = commits;
  let remainingMinutes = Math.round(commits * uniform(rng, 15, 28));
  for (let s = 0; s < sessions; s++) {
    const last = s === sessions - 1;
    const sessionsLeft = sessions - s;
    const partCommits = last
      ? remainingCommits
      : clamp(
          Math.round(uniform(rng, 0.3, 0.6) * remainingCommits),
          1,
          remainingCommits - (sessionsLeft - 1)
        );
    const partMinutes = last
      ? remainingMinutes
      : clamp(
          Math.round(uniform(rng, 0.3, 0.6) * remainingMinutes),
          10,
          remainingMinutes - 10 * (sessionsLeft - 1)
        );
    remainingCommits -= partCommits;
    remainingMinutes -= partMinutes;
    const time = hhmm(rng, 20 * 60, 23 * 60 + 59);
    events.push(
      makeEvent(dateKey, s, "coding", "coding.commits", partCommits, "commits", "demo", 0.95, time, {
        repo: pick(rng, REPOS),
      }),
      makeEvent(dateKey, s, "coding", "coding.minutes", partMinutes, "min", "demo", 0.95, time, {
        repo: pick(rng, REPOS),
      })
    );
  }
  return events;
}

function genSleep(dateKey: string, _daysAgo: number, rng: () => number): LifeEvent[] {
  const weekend = weekdayOf(dateKey) === 0 || weekdayOf(dateKey) === 6;
  // mean 7h00, +25 min on weekends, σ 22 min, clamped to the 6.5–7.5h band.
  const minutes = Math.round(clamp(gaussian(rng, 420 + (weekend ? 25 : 0), 22), 390, 450));
  return [
    makeEvent(dateKey, 0, "health", "health.sleep.minutes", minutes, "min", "apple_health", 0.9, hhmm(rng, 7 * 60, 8 * 60), {
      in_bed_min: minutes + 12,
    }),
  ];
}

/* ------------------------------------------------------------------ */

/**
 * streamKey is FROZEN to the legacy stream names — the deterministic hash
 * streams must never change when a domain is renamed, or every rendered
 * number shifts. Health runs two independent streams (fitness + sleep).
 */
const GENERATORS: {
  domain: Domain;
  streamKey: string;
  gen: (dateKey: string, daysAgo: number, rng: () => number) => LifeEvent[];
}[] = [
  { domain: "learning", streamKey: "study", gen: genStudy },
  { domain: "english", streamKey: "english", gen: genEnglish },
  { domain: "coding", streamKey: "coding", gen: genCoding },
  { domain: "health", streamKey: "fitness", gen: genFitness },
  { domain: "health", streamKey: "sleep", gen: genSleep },
];

/**
 * Pure and deterministic: generateEvents() always returns the same array
 * (~2.1k events). Consumed by the seed script; the web app reads Postgres.
 */
export function generateEvents(): LifeEvent[] {
  const events: LifeEvent[] = [];
  for (let i = 0; i < DAYS; i++) {
    const dateKey = addDays(FIRST_DATE, i);
    const daysAgo = daysBetween(dateKey, MOCK_LAST_DATE);
    for (const g of GENERATORS) {
      const rng = rngFor(SEED, g.streamKey, dateKey);
      events.push(...g.gen(dateKey, daysAgo, rng));
    }
  }
  events.sort((a, b) => (a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0));
  return events;
}
