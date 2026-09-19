/**
 * Data contracts — the future PostgreSQL `events` row shape plus the DTOs
 * served to pages. M2/M3 swap the selector bodies for API calls; these
 * types move to packages/analytics and stay identical.
 */

export type Domain = "study" | "english" | "fitness" | "coding" | "sleep";

/** Domains that participate in the heatmap (sleep is excluded: its target is bidirectional). */
export type HeatmapDomain = "study" | "english" | "fitness" | "coding";

export type Source =
  | "manual"
  | "timer"
  | "github"
  | "anki"
  | "apple_health"
  | "hevy";

/** Mirrors the future Event table 1:1. */
export interface LifeEvent {
  event_id: string;
  user_id: string;
  /** ISO 8601 with +08:00 offset. */
  timestamp: string;
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
  study: HeatmapDayCell;
  english: HeatmapDayCell;
  fitness: HeatmapDayCell;
  coding: HeatmapDayCell;
}

export type WindowKey = "30D" | "90D" | "1Y" | "Beginning";

export interface TrendPoint {
  /** Week start date key. */
  label: string;
  value: number;
}

export interface VersusRow {
  domain: Domain;
  metricLabel: string;
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
}

export interface GoalProgress {
  /** Weighted readiness, e.g. 72. Never presented as a "Life Score". */
  overall: number;
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
  domain: Domain;
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
