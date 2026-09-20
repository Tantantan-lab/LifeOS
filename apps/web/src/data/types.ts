/**
 * Data contracts — the future PostgreSQL `events` row shape plus the DTOs
 * served to pages. M2/M3 swap the selector bodies for API calls; these
 * types move to packages/analytics and stay identical.
 */

export type Domain =
  | "learning"
  | "english"
  | "coding"
  | "health"
  | "productivity";

/**
 * Heatmap facets. Sleep stays excluded (band target — not "more is
 * better"); workouts are a facet of their own with a trailing-7 weekly
 * goal since real Xunji data arrived.
 */
export type HeatmapDomain =
  | "learning"
  | "english"
  | "coding"
  | "productivity"
  | "fitness";

/** "demo" = seeded mock history; the rest are real connectors. */
export type Source =
  | "demo"
  | "manual"
  | "timer"
  | "github"
  | "weread"
  | "maimemo"
  | "ticktick"
  | "anki"
  | "apple_health"
  | "hevy";

/** Mirrors the events table 1:1. */
export interface LifeEvent {
  event_id: string;
  user_id: string;
  /** ISO 8601 with +08:00 offset. */
  timestamp: string;
  /** Attributed calendar date (+08:00) — the grouping key for all selectors. */
  local_date: string;
  domain: Domain;
  metric: string;
  value: number;
  unit: string;
  source: Source;
  /** 0..1 — device data 0.95, inferred 0.7, manual 1.0. */
  confidence: number;
  metadata: Record<string, string | number | boolean>;
}

export type Trend = "improving" | "stable" | "declining";

/** Heatmap intensity levels: 0% / 1-25% / 25-50% / 50-80% / 80-100%. */
export type Level = 0 | 1 | 2 | 3 | 4;

export interface DomainSummary {
  domain: Domain;
  /** "1h 52m" / "48" / "7h 06m" — headline number, numbers-first. */
  headline: string;
  /** "/day" / "/week" / "/night" */
  unitLabel: string;
  /** % change of the last 30 days vs the previous 30. */
  deltaPct: number;
  trend: Trend;
  /** Last 30 daily values (for the sparkline). */
  spark: number[];
  /** Today's completion 0..1 (null for sleep). */
  todayCompletion: number | null;
  todayValueLabel: string | null;
  /** Whether the domain has ANY data (keeps zero-data domains out of aggregates). */
  hasData: boolean;
}

/** Evidence-based next step — the closing link of the core loop. */
export interface NextBestAction {
  /** "Study time · +35 min" */
  title: string;
  /** WHY this is recommended — never just "go study". */
  reason: string;
  domain: Domain;
  /** Metric the Start timer will log minutes against. */
  metric: string;
  /** Suggested session length in minutes. */
  minutes: number;
  /** Structured fields so UIs can compose locale-specific sentences. */
  label: string;
  gapPct: number;
  targetLabel: string;
  /** true when the suggestion is a duration ("+N min"), false for counts. */
  isDuration: boolean;
  extra: number;
  /** Formatted 30-day average, e.g. "0.3 words" — for evidence sentences. */
  currentLabel: string;
}

export interface InsightTrendRow {
  domain: Domain;
  label: string;
  metric: string;
  delta30: number;
  delta90: number;
  trend90: Trend;
  /** has_real_data / mock_only / no_data — the LLM-facing honesty flag. */
  dataState: "has_real_data" | "mock_only" | "no_data";
}

export interface HeaderStatus {
  greeting: string;
  /** Data-driven line, e.g. "You're ahead of your 90-day self." */
  line: string;
  dateLabel: string;
  /** Locale-neutral state — UI translates; never a canned phrase. */
  state: "ahead" | "below" | "steady";
  /** The data-bearing domain with the largest 90-day move. */
  top: { label: string; deltaPct: number } | null;
}

export interface DataSourceRow {
  source: Source;
  label: string;
  connected: boolean;
  lastSyncAt: string | null;
  events30d: number;
  /** true → a real connector (sync via the API); false → mock provenance. */
  isConnector: boolean;
}

export interface HeatmapDayCell {
  /** Completion vs goal, capped at 1. */
  completion: number;
  level: Level;
  /** Raw value of the cell's metric that day (0 when nothing logged). */
  value: number;
  /** Value shown in the tooltip (trailing-7-day count for weekly-goal domains). */
  displayValue: number | null;
}

export interface HeatmapDay {
  date: string;
  completionAll: number;
  levelAll: Level;
  learning: HeatmapDayCell;
  english: HeatmapDayCell;
  coding: HeatmapDayCell;
  productivity: HeatmapDayCell;
  fitness: HeatmapDayCell;
}

export type WindowKey = "30D" | "90D" | "1Y" | "Beginning";

export interface TrendPoint {
  /** Week start date key. */
  label: string;
  value: number;
}

export interface VersusRow {
  /** Stable row key from VERSUS_ROWS (metric identity, not domain). */
  key: string;
  domain: Domain;
  label: string;
  thenLabel: string;
  nowLabel: string;
  unitLabel: string;
  deltaPct: number;
  trend: Trend;
  /** Inline sparkline over the NOW window. */
  spark: number[];
  /** Weekly rollups for the detail chart + THEN average (dashed line). */
  series: { weekly: TrendPoint[]; thenAvg: number };
}

export interface MeVsMeWindow {
  windowKey: WindowKey;
  /** "Aug 21 – Sep 19" */
  nowRange: string;
  thenRange: string;
  rows: VersusRow[];
}

export interface SkillBenchmark {
  skill: string;
  /** null = not started. */
  score: number | null;
  target: number;
  weight: number;
  gap: number | null;
  evidence: string;
  /** Completed / Proficient / Learning / Not started. */
  status: string;
}

export interface GoalProgress {
  /** Weighted readiness — null when no skill has been assessed yet.
   *  Never presented as a "Life Score". */
  overall: number | null;
  /** Level band: 1 = <50, 2 = 50-79, 3 = 80-94, 4 = 95+. */
  level: number;
  targetLabel: string;
  skills: SkillBenchmark[];
  updatedLabel: string;
  evidenceDays: number;
}

export interface GapItem {
  rank: number;
  skill: string;
  gapLabel: string;
  note: string;
}

export interface GoalRow {
  /** Stable row key from GOAL_ROWS (metric identity, not domain). */
  key: string;
  domain: Domain;
  label: string;
  targetLabel: string;
  currentLabel: string;
  /** 0..1 completion vs goal. */
  completion: number;
  /** Share of days meeting the goal, last 7 / last 30. */
  consistency7d: number;
  consistency30d: number;
  deltaPct: number;
  trend: Trend;
}

export interface TodayItem {
  time: string;
  domain: Domain;
  metricLabel: string;
  valueLabel: string;
  sourceLabel: string;
  confidence: number;
}

export interface HeatmapStats {
  activeDays90d: number;
  currentStreak: number;
  longestStreak: number;
  avgCompletion90d: number;
  perDomain: {
    domain: HeatmapDomain;
    activeDays: number;
    avgCompletion: number;
  }[];
}

export interface InsightPreview {
  title: string;
  body: string;
}

/** A stored AI insight (insights table). */
export interface InsightRecord {
  period: "week" | "month";
  periodStart: string;
  periodEnd: string;
  provider: string;
  model: string;
  createdAt: string;
  content: { fact: string; trend: string; gap: string; action: string };
}
