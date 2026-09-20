import type { Domain, HeatmapDomain, Source, WindowKey } from "@/data/types";

/**
 * M3 taxonomy: learning / english / coding / health / productivity.
 * Metric catalog is namespaced (domain.thing.unit). One rule governs every
 * name: same real-world quantity → same metric (mock and real sources merge
 * into one series); different quantity → different metric (never merge).
 */

/**
 * Last day of the MOCK dataset — used ONLY by generator.ts / seed.ts.
 * Selectors use src/lib/today.ts (real today, Asia/Shanghai). Today equals
 * this date at seed time, so mock numbers render identically on day one.
 */
export const MOCK_LAST_DATE = "2026-09-19";

/** First day of the mock dataset; the heatmap grid is frozen to its Sunday. */
export const DATASET_START = "2025-09-20";
export const GRID_START = "2025-09-14";

export const USER_ID = "user_local_001";

/**
 * FNV-1a seed. streamKey is frozen to the LEGACY domain names so the
 * deterministic hash streams never change — without this every rendered
 * number shifts when a domain is renamed.
 */
export const SEED = 271828;

export const TIMEZONE = "Asia/Shanghai";
export const TIMEZONE_OFFSET = "+08:00";

export interface DomainMeta {
  label: string;
  /** Primary metric feeding completions and headlines. */
  primaryMetric: string;
  /**
   * Secondary metrics that COUNT toward the domain's completion/summary
   * (learning: reading minutes join study minutes once real history
   * exists — WeRead has 69 days and is live).
   */
  extraMetrics: string[];
  /** Human label of the primary metric. */
  metricLabel: string;
  unitLabel: string;
  goalLabel: string;
  dayGoal: number;
  /** "day" → today vs dayGoal. "trailing7" → trailing-7 sum vs weeklyGoal. */
  goalMode: "day" | "trailing7";
  weeklyGoal: number | null;
  /** Typical sources of the MOCK events (Today/tooltip provenance). */
  sources: Source[];
  confidences: number[];
}

export const DOMAIN_META: Record<Domain, DomainMeta> = {
  learning: {
    label: "Learning",
    primaryMetric: "learning.study.minutes",
    extraMetrics: ["learning.reading.minutes"],
    metricLabel: "Study time",
    unitLabel: "/day",
    goalLabel: "120 min/day",
    dayGoal: 120,
    goalMode: "day",
    weeklyGoal: null,
    sources: ["timer"],
    confidences: [0.95],
  },
  english: {
    label: "English",
    primaryMetric: "english.words.reviewed",
    extraMetrics: [],
    metricLabel: "Words reviewed",
    unitLabel: "/day",
    goalLabel: "40 words/day",
    dayGoal: 40,
    goalMode: "day",
    weeklyGoal: null,
    sources: ["anki"],
    confidences: [0.95],
  },
  coding: {
    label: "Coding",
    primaryMetric: "coding.commits",
    extraMetrics: [],
    metricLabel: "Commits",
    unitLabel: "/week",
    goalLabel: "10 commits/week",
    dayGoal: 0,
    goalMode: "trailing7",
    weeklyGoal: 10,
    sources: ["demo"],
    confidences: [0.95],
  },
  health: {
    label: "Health",
    primaryMetric: "health.sleep.minutes",
    extraMetrics: [],
    metricLabel: "Sleep",
    unitLabel: "/night",
    goalLabel: "6.5–7.5h band",
    dayGoal: 420,
    goalMode: "day",
    weeklyGoal: null,
    sources: ["apple_health"],
    confidences: [0.9],
  },
  productivity: {
    label: "Productivity",
    primaryMetric: "productivity.tasks.completed",
    extraMetrics: [],
    metricLabel: "Tasks completed",
    unitLabel: "/week",
    goalLabel: "15 tasks/week",
    dayGoal: 0,
    goalMode: "trailing7",
    weeklyGoal: 15,
    sources: ["demo"],
    confidences: [0.9],
  },
};

/**
 * Heatmap domains — health is excluded by design: sleep's target is a band
 * (not a floor), and health carries two unlike metrics (sleep + workout).
 */
export const HEATMAP_DOMAINS: HeatmapDomain[] = [
  "learning",
  "english",
  "coding",
  "productivity",
  "fitness",
];

/** Workout facet metadata — fitness is a heatmap facet, not a domain card. */
export const FITNESS_HEATMAP = {
  domain: "health" as Domain,
  metric: "health.workout.session",
  weeklyGoal: 3,
};

export const HEATMAP_META: Record<
  HeatmapDomain,
  { label: string; goalLabel: string; goalMode: "day" | "trailing7"; unit: string }
> = {
  learning: { label: "Learning", goalLabel: "120 min/day", goalMode: "day", unit: "min" },
  english: { label: "English", goalLabel: "40 words/day", goalMode: "day", unit: "words" },
  coding: { label: "Coding", goalLabel: "10 commits/week", goalMode: "trailing7", unit: "commits" },
  productivity: { label: "Productivity", goalLabel: "15 tasks/week", goalMode: "trailing7", unit: "tasks" },
  fitness: { label: "Fitness", goalLabel: "3 sessions/week", goalMode: "trailing7", unit: "sessions" },
};

/** Me vs Me rows — metric-keyed; rows without data are filtered at render. */
export const VERSUS_ROWS: {
  key: string;
  domain: Domain;
  metric: string;
  label: string;
  aggregation: "sum" | "avg";
  format: "duration" | "hours1" | "count";
  unitLabel: string;
}[] = [
  { key: "study", domain: "learning", metric: "learning.study.minutes", label: "Study time", aggregation: "avg", format: "duration", unitLabel: "/day" },
  { key: "reading", domain: "learning", metric: "learning.reading.minutes", label: "Reading", aggregation: "avg", format: "duration", unitLabel: "/day" },
  { key: "words", domain: "english", metric: "english.words.reviewed", label: "Words reviewed", aggregation: "avg", format: "count", unitLabel: "/day" },
  { key: "english-time", domain: "english", metric: "english.minutes", label: "Vocabulary time", aggregation: "avg", format: "duration", unitLabel: "/day" },
  { key: "coding", domain: "coding", metric: "coding.minutes", label: "Coding", aggregation: "sum", format: "hours1", unitLabel: "" },
  { key: "workout", domain: "health", metric: "health.workout.session", label: "Workouts", aggregation: "sum", format: "count", unitLabel: "sessions" },
  { key: "workout-time", domain: "health", metric: "health.workout.minutes", label: "Workout time", aggregation: "sum", format: "duration", unitLabel: "total" },
  { key: "sleep", domain: "health", metric: "health.sleep.minutes", label: "Sleep", aggregation: "avg", format: "duration", unitLabel: "/night" },
  { key: "tasks", domain: "productivity", metric: "productivity.tasks.completed", label: "Tasks completed", aggregation: "sum", format: "count", unitLabel: "tasks" },
];

/** Goals rows — metric-keyed; the Goals page renders one card per row. */
export const GOAL_ROWS: {
  key: string;
  domain: Domain;
  metric: string;
  label: string;
  targetLabel: string;
  mode: "avg" | "weekly" | "band";
  dayGoal: number;
  weeklyGoal: number | null;
  bandMin: number | null;
  bandMax: number | null;
}[] = [
  { key: "study", domain: "learning", metric: "learning.study.minutes", label: "Study time", targetLabel: "120 min/day", mode: "avg", dayGoal: 120, weeklyGoal: null, bandMin: null, bandMax: null },
  { key: "reading", domain: "learning", metric: "learning.reading.minutes", label: "Reading", targetLabel: "30 min/day (soft)", mode: "avg", dayGoal: 30, weeklyGoal: null, bandMin: null, bandMax: null },
  { key: "words", domain: "english", metric: "english.words.reviewed", label: "Vocabulary", targetLabel: "40 words/day", mode: "avg", dayGoal: 40, weeklyGoal: null, bandMin: null, bandMax: null },
  { key: "commits", domain: "coding", metric: "coding.commits", label: "Commits", targetLabel: "10 commits/week", mode: "weekly", dayGoal: 0, weeklyGoal: 10, bandMin: null, bandMax: null },
  { key: "workout", domain: "health", metric: "health.workout.session", label: "Workouts", targetLabel: "3 sessions/week", mode: "weekly", dayGoal: 0, weeklyGoal: 3, bandMin: null, bandMax: null },
  { key: "sleep", domain: "health", metric: "health.sleep.minutes", label: "Sleep", targetLabel: "6.5–7.5h band", mode: "band", dayGoal: 420, weeklyGoal: null, bandMin: 390, bandMax: 450 },
  { key: "tasks", domain: "productivity", metric: "productivity.tasks.completed", label: "Tasks completed", targetLabel: "15 tasks/week", mode: "weekly", dayGoal: 0, weeklyGoal: 15, bandMin: null, bandMax: null },
];

/**
 * Me vs Me windows. NOW and THEN are inclusive date ranges counting back
 * from today. 1Y compares two 182-day halves because the dataset is 365
 * days. The UI always prints the resolved ranges (docs/data-model.md).
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
 * Overseas Engineer readiness. Scores are REAL assessments only — all null
 * until real evidence arrives (self-assessment input or connected data);
 * targets stay as the benchmark coordinates. No invented numbers.
 */
export const TARGET_LABEL = "Overseas Engineer";

export const SKILLS = [
  { skill: "Python", score: null, target: 86, weight: 0.2, evidence: "Not assessed yet" },
  { skill: "Linux", score: null, target: 84, weight: 0.15, evidence: "Not assessed yet" },
  { skill: "Docker", score: null, target: 80, weight: 0.15, evidence: "Not assessed yet" },
  { skill: "Kubernetes", score: null, target: 85, weight: 0.25, evidence: "Not assessed yet" },
  { skill: "English", score: null, target: 90, weight: 0.25, evidence: "Not assessed yet" },
] as const;

/** Present in the gap list but not yet scored. */
export const NOT_STARTED_SKILL = {
  skill: "Cloud",
  note: "Not started",
} as const;

/** Gap pace estimate, in points/week (used for "~N weeks at your current pace"). */
export const GAP_PACE_POINTS_PER_WEEK = 2.5;
