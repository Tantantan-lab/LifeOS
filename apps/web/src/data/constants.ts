import type { Domain, HeatmapDomain, Source, WindowKey } from "@/data/types";

/**
 * Fixed anchor — NOT new Date(). Static prerendering would freeze "today"
 * into the HTML otherwise. M2 replaces this with request-time data.
 * 2026-09-19 is a Saturday; the dataset spans 2025-09-20 … 2026-09-19
 * (365 days), Sunday-aligned grid start = 2025-09-14 → 53 weeks × 7 = 371
 * cells with 6 leading blanks.
 */
export const ANCHOR_DATE = "2026-09-19";

export const USER_ID = "user_local_001";

/** FNV-1a seed for the deterministic generator. Chosen by sweep so the
 *  one-year story reads: study +36% / english improving / fitness stable /
 *  coding +39% — with a realistic last-30-days for every domain. */
export const SEED = 271828;

export const TIMEZONE_OFFSET = "+08:00";

export interface DomainMeta {
  label: string;
  /** Primary metric feeding completions and headlines. */
  primaryMetric: string;
  /** Human label of the primary metric. */
  metricLabel: string;
  unitLabel: string;
  /** Goal label shown on Goals / in tooltips. */
  goalLabel: string;
  /** Daily goal in primary-metric units (for direct-ratio domains). */
  dayGoal: number;
  /** "day" → today vs dayGoal. "trailing7" → sum over trailing 7 days vs weeklyGoal. */
  goalMode: "day" | "trailing7";
  weeklyGoal: number | null;
  /** Sum over the window vs average per day. */
  windowAggregation: "sum" | "avg";
  /** Typical sources for generated events. */
  sources: Source[];
  confidences: number[];
}

export const DOMAIN_META: Record<Domain, DomainMeta> = {
  study: {
    label: "Study",
    primaryMetric: "study_minutes",
    metricLabel: "Study",
    unitLabel: "/day",
    goalLabel: "120 min/day",
    dayGoal: 120,
    goalMode: "day",
    weeklyGoal: null,
    windowAggregation: "avg",
    sources: ["timer"],
    confidences: [0.95],
  },
  english: {
    label: "English",
    primaryMetric: "vocabulary_review",
    metricLabel: "Vocabulary",
    unitLabel: "/day",
    goalLabel: "40 words/day",
    dayGoal: 40,
    goalMode: "day",
    weeklyGoal: null,
    windowAggregation: "avg",
    sources: ["anki"],
    confidences: [0.95],
  },
  fitness: {
    label: "Fitness",
    primaryMetric: "workout_session",
    metricLabel: "Workouts",
    unitLabel: "/week",
    goalLabel: "3 sessions/week",
    dayGoal: 0,
    goalMode: "trailing7",
    weeklyGoal: 3,
    windowAggregation: "sum",
    sources: ["hevy"],
    confidences: [0.95],
  },
  coding: {
    label: "Coding",
    primaryMetric: "coding_commits",
    metricLabel: "Commits",
    unitLabel: "/week",
    goalLabel: "10 commits/week",
    dayGoal: 0,
    goalMode: "trailing7",
    weeklyGoal: 10,
    windowAggregation: "sum",
    sources: ["github"],
    confidences: [0.95],
  },
  sleep: {
    label: "Sleep",
    primaryMetric: "sleep_minutes",
    metricLabel: "Sleep",
    unitLabel: "/night",
    goalLabel: "6.5–7.5h band",
    dayGoal: 420,
    goalMode: "day",
    weeklyGoal: null,
    windowAggregation: "avg",
    sources: ["apple_health"],
    confidences: [0.9],
  },
};

export const HEATMAP_DOMAINS: HeatmapDomain[] = [
  "study",
  "english",
  "fitness",
  "coding",
];

/**
 * Me vs Me windows. NOW and THEN are inclusive date ranges counting back
 * from ANCHOR_DATE. 1Y compares two 182-day halves because the dataset is
 * 365 days. The UI always prints the resolved ranges (docs/data-model.md).
 */
export const WINDOWS: Record<
  WindowKey,
  { length: number; nowStartOffset: number; thenStartOffset: number }
> = {
  "30D": { length: 30, nowStartOffset: 29, thenStartOffset: 59 },
  "90D": { length: 90, nowStartOffset: 89, thenStartOffset: 179 },
  "1Y": { length: 182, nowStartOffset: 181, thenStartOffset: 364 },
  Beginning: { length: 30, nowStartOffset: 29, thenStartOffset: 364 },
};

export const WINDOW_ORDER: WindowKey[] = ["30D", "90D", "1Y", "Beginning"];

/**
 * Overseas Engineer readiness. Weights are chosen so the weighted mean is
 * exactly 71.8 → displays 72 — asserted in selectors.ts so it cannot drift.
 */
export const TARGET_LABEL = "Overseas Engineer";

export const SKILLS = [
  {
    skill: "Python",
    score: 86,
    target: 86,
    weight: 0.2,
    evidence: "12+ projects · daily driver",
  },
  {
    skill: "Linux",
    score: 80,
    target: 84,
    weight: 0.15,
    evidence: "daily shell & server ops",
  },
  {
    skill: "Docker",
    score: 74,
    target: 80,
    weight: 0.15,
    evidence: "containerized 8 apps",
  },
  {
    skill: "Kubernetes",
    score: 50,
    target: 85,
    weight: 0.25,
    evidence: "CKA prep · week 3",
  },
  {
    skill: "English",
    score: 76,
    target: 90,
    weight: 0.25,
    evidence: "IELTS mock 6.0 · 57 words/day",
  },
] as const;

/** Present in the gap list but not yet scored. */
export const NOT_STARTED_SKILL = {
  skill: "Cloud",
  note: "Not started",
} as const;

/** Gap pace estimate, in points/week (used for "~N weeks at your current pace"). */
export const GAP_PACE_POINTS_PER_WEEK = 2.5;
