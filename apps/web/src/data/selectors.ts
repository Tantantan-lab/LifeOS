/**
 * The query surface every page reads from. M3: events come from Postgres
 * (src/data/db.ts → getEvents), the index is built lazily on first await,
 * and all windows are computed from REAL today (src/lib/today.ts) — the
 * mock dataset simply occupies the trailing 365 days ending today.
 *
 * Rules:
 *  - Components import ONLY from this file (never db/generator).
 *  - All date math happens here; components receive date strings only.
 *  - Goal targets come from GOAL_ROWS in constants.ts; the `goals` table
 *    is WRITTEN (seed) but not read yet.
 */

import {
  DATASET_START,
  DOMAIN_META,
  GAP_PACE_POINTS_PER_WEEK,
  GOAL_ROWS,
  GRID_START,
  HEATMAP_DOMAINS,
  NOT_STARTED_SKILL,
  SKILLS,
  TARGET_LABEL,
  VERSUS_ROWS,
  WINDOWS,
  WINDOW_ORDER,
} from "@/data/constants";
import { getEvents, getLatestInsight } from "@/data/db";
import type {
  DataSourceRow,
  Domain,
  DomainSummary,
  GapItem,
  GoalProgress,
  GoalRow,
  HeaderStatus,
  HeatmapDay,
  HeatmapDayCell,
  HeatmapDomain,
  HeatmapStats,
  InsightPreview,
  InsightTrendRow,
  Level,
  LifeEvent,
  MeVsMeWindow,
  NextBestAction,
  SkillBenchmark,
  TodayItem,
  Trend,
  VersusRow,
  WindowKey,
} from "@/data/types";
import { getDataSources as getDataSourcesDb } from "@/data/db";
import { addDays, daysBetween, formatDateLong, formatRange } from "@/lib/dates";
import { formatCount, formatDuration, formatHours1, formatMonthDay, formatTime } from "@/lib/format";
import { SOURCE_LABELS } from "@/lib/copy";
import { LIFEOS_TIMEZONE, todayKey } from "@/lib/today";

/* ------------------------------------------------------------------ */
/* Event index (lazy — built from Postgres on first await)             */
/* ------------------------------------------------------------------ */

export interface EventIndex {
  byDomainDate: Map<Domain, Map<string, LifeEvent[]>>;
}

function buildIndex(events: LifeEvent[]): EventIndex {
  const byDomainDate = new Map<Domain, Map<string, LifeEvent[]>>();
  for (const e of events) {
    const dayMap = byDomainDate.get(e.domain) ?? new Map();
    const list = dayMap.get(e.local_date) ?? [];
    list.push(e);
    dayMap.set(e.local_date, list);
    byDomainDate.set(e.domain, dayMap);
  }
  return { byDomainDate };
}

let indexPromise: Promise<EventIndex> | null = null;

function getEventIndex(): Promise<EventIndex> {
  indexPromise ??= getEvents()
    .then(buildIndex)
    .catch((e) => {
      indexPromise = null; // a failed load never poisons the cache
      throw e;
    });
  return indexPromise;
}

/** Drop the in-memory index — called after a manual write so the next
 *  render recomputes from the database. */
export function invalidateEventIndex(): void {
  indexPromise = null;
}

/* ------------------------------------------------------------------ */
/* Pure helpers over the index (anchor-free: real `today` per call)    */
/* ------------------------------------------------------------------ */

function eventsOn(idx: EventIndex, domain: Domain, dateKey: string): LifeEvent[] {
  return idx.byDomainDate.get(domain)?.get(dateKey) ?? [];
}

function metricValueOn(idx: EventIndex, domain: Domain, metric: string, dateKey: string): number {
  return eventsOn(idx, domain, dateKey)
    .filter((e) => e.metric === metric)
    .reduce((sum, e) => sum + e.value, 0);
}

function sumMetric(idx: EventIndex, domain: Domain, metric: string, from: string, to: string): number {
  let sum = 0;
  for (let d = from; daysBetween(d, to) >= 0; d = addDays(d, 1)) {
    sum += metricValueOn(idx, domain, metric, d);
  }
  return sum;
}

/** Daily values of a metric over a window (oldest → newest). */
function dailySeries(idx: EventIndex, domain: Domain, metric: string, from: string, to: string): number[] {
  const out: number[] = [];
  for (let d = from; daysBetween(d, to) >= 0; d = addDays(d, 1)) {
    out.push(metricValueOn(idx, domain, metric, d));
  }
  return out;
}

/** A day is "active" when ANY heatmap-domain event was logged — streaks
 *  and active-day counts use raw activity, not completion: a trailing-7
 *  window can stay >0 for days after the last logged day, which would
 *  keep a streak alive on days where nothing actually happened. */
function hasAnyEvent(idx: EventIndex, dateKey: string): boolean {
  for (const domain of HEATMAP_DOMAINS) {
    if (eventsOn(idx, domain, dateKey).length > 0) return true;
  }
  return false;
}

/** Heatmap domains that have ANY event in [to-29, to] — the data-aware
 *  "All" denominator keeps empty domains from dragging the average. */
function domainsWithData(idx: EventIndex, to: string): Set<HeatmapDomain> {
  const from = addDays(to, -29);
  const set = new Set<HeatmapDomain>();
  for (const domain of HEATMAP_DOMAINS) {
    const dayMap = idx.byDomainDate.get(domain);
    if (!dayMap) continue;
    for (const dateKey of dayMap.keys()) {
      if (daysBetween(from, dateKey) >= 0 && daysBetween(dateKey, to) >= 0) {
        set.add(domain);
        break;
      }
    }
  }
  return set;
}

/* ------------------------------------------------------------------ */
/* Shared math                                                         */
/* ------------------------------------------------------------------ */

export function levelOf(completion: number): Level {
  if (completion <= 0) return 0; // 0%
  if (completion <= 0.25) return 1; // 1-25%
  if (completion <= 0.5) return 2; // 25-50%
  if (completion <= 0.8) return 3; // 50-80%
  return 4; // 80-100%
}

/** Completion vs goal, capped at 100% — 16h is never darker than 8h. */
function completionForDomain(idx: EventIndex, domain: HeatmapDomain, dateKey: string): number {
  const meta = DOMAIN_META[domain];
  if (meta.goalMode === "day") {
    return Math.min(1, metricValueOn(idx, domain, meta.primaryMetric, dateKey) / meta.dayGoal);
  }
  const total = sumMetric(idx, domain, meta.primaryMetric, addDays(dateKey, -6), dateKey);
  return Math.min(1, total / (meta.weeklyGoal ?? 1));
}

/** Goal-row completion (GOAL_ROWS may target non-heatmap metrics). */
function completionForGoal(idx: EventIndex, row: (typeof GOAL_ROWS)[number], dateKey: string): number {
  if (row.mode === "band") {
    const v = metricValueOn(idx, row.domain, row.metric, dateKey);
    return v >= (row.bandMin ?? 0) && v <= (row.bandMax ?? Number.POSITIVE_INFINITY) ? 1 : 0;
  }
  if (row.mode === "weekly") {
    const total = sumMetric(idx, row.domain, row.metric, addDays(dateKey, -6), dateKey);
    return Math.min(1, total / (row.weeklyGoal ?? 1));
  }
  return Math.min(1, metricValueOn(idx, row.domain, row.metric, dateKey) / row.dayGoal);
}

function completionAllOn(idx: EventIndex, dateKey: string, active: Set<HeatmapDomain>): number {
  if (active.size === 0) return 0;
  let sum = 0;
  for (const d of active) sum += completionForDomain(idx, d, dateKey);
  return sum / active.size;
}

function trendOf(deltaPct: number, epsilon = 3): Trend {
  if (deltaPct > epsilon) return "improving";
  if (deltaPct < -epsilon) return "declining";
  return "stable";
}

function deltaPctOf(now: number, then: number): number {
  if (then <= 0) return now > 0 ? 100 : 0;
  return ((now - then) / then) * 100;
}

const PREV_OFFSETS = {
  last30: { from: 29, to: 0 },
  prev30: { from: 59, to: 30 },
  last90: { from: 89, to: 0 },
  prev90: { from: 179, to: 90 },
} as const;

function windowRange(off: { from: number; to: number }, today: string) {
  return { from: addDays(today, -off.from), to: addDays(today, -off.to) };
}

/* ------------------------------------------------------------------ */
/* Selectors                                                           */
/* ------------------------------------------------------------------ */

export async function getDomainSummaries(): Promise<DomainSummary[]> {
  const idx = await getEventIndex();
  const today = todayKey();
  const last30 = windowRange(PREV_OFFSETS.last30, today);
  const prev30 = windowRange(PREV_OFFSETS.prev30, today);
  const domains = Object.keys(DOMAIN_META) as Domain[];

  return domains.map((domain) => {
    const meta = DOMAIN_META[domain];
    const nowSum = sumMetric(idx, domain, meta.primaryMetric, last30.from, last30.to);
    const thenSum = sumMetric(idx, domain, meta.primaryMetric, prev30.from, prev30.to);
    const delta = deltaPctOf(nowSum, thenSum);

    let headline: string;
    switch (domain) {
      case "learning":
        headline = formatDuration(nowSum / 30);
        break;
      case "english":
        headline = formatCount(nowSum / 30);
        break;
      case "coding":
      case "productivity":
        headline = formatCount((nowSum * 7) / 30);
        break;
      case "health":
        headline = formatDuration(nowSum / 30);
        break;
    }

    const spark = dailySeries(idx, domain, meta.primaryMetric, last30.from, last30.to);

    const isHeatmapDomain = HEATMAP_DOMAINS.includes(domain as HeatmapDomain);
    const todayCompletion = isHeatmapDomain
      ? completionForDomain(idx, domain as HeatmapDomain, today)
      : null;
    const todayValue = metricValueOn(idx, domain, meta.primaryMetric, today);
    const todayValueLabel =
      todayValue > 0 ? formatTodayValue(domain, todayValue) : null;

    return {
      domain,
      headline,
      unitLabel: meta.unitLabel,
      deltaPct: delta,
      trend: trendOf(delta),
      spark,
      todayCompletion,
      todayValueLabel,
      hasData: nowSum > 0 || thenSum > 0,
    };
  });
}

export async function getHeatmapData(): Promise<{ gridStart: string; days: HeatmapDay[] }> {
  const idx = await getEventIndex();
  const today = todayKey();
  const active = domainsWithData(idx, today);

  const days: HeatmapDay[] = [];
  for (let d = DATASET_START; daysBetween(d, today) >= 0; d = addDays(d, 1)) {
    const cells = {} as Record<HeatmapDomain, HeatmapDayCell>;
    for (const domain of HEATMAP_DOMAINS) {
      const completion = completionForDomain(idx, domain, d);
      const meta = DOMAIN_META[domain];
      const value = metricValueOn(idx, domain, meta.primaryMetric, d);
      const displayValue =
        meta.goalMode === "trailing7"
          ? sumMetric(idx, domain, meta.primaryMetric, addDays(d, -6), d)
          : value;
      cells[domain] = { completion, level: levelOf(completion), value, displayValue };
    }
    const completionAll = completionAllOn(idx, d, active);
    days.push({
      date: d,
      completionAll,
      levelAll: levelOf(completionAll),
      learning: cells.learning,
      english: cells.english,
      coding: cells.coding,
      productivity: cells.productivity,
    });
  }
  return { gridStart: GRID_START, days };
}

/* ---- Me vs Me ---- */

function formatVersusValue(format: "duration" | "hours1" | "count", value: number): string {
  switch (format) {
    case "duration":
      return formatDuration(value);
    case "hours1":
      return formatHours1(value);
    case "count":
      return formatCount(value);
  }
}

export async function getMeVsMeAll(): Promise<Record<WindowKey, MeVsMeWindow>> {
  const idx = await getEventIndex();
  const today = todayKey();
  const out = {} as Record<WindowKey, MeVsMeWindow>;

  for (const key of WINDOW_ORDER) {
    const w = WINDOWS[key];
    const nowFrom = addDays(today, -w.nowStartOffset);
    const nowTo = today;
    const thenFrom = addDays(today, -w.thenStartOffset);
    const thenTo = addDays(today, -w.thenStartOffset + w.length - 1);

    const rows: VersusRow[] = [];
    for (const cfg of VERSUS_ROWS) {
      const nowSum = sumMetric(idx, cfg.domain, cfg.metric, nowFrom, nowTo);
      const thenSum = sumMetric(idx, cfg.domain, cfg.metric, thenFrom, thenTo);
      if (nowSum === 0 && thenSum === 0) continue; // no data in either window
      const nowValue = cfg.aggregation === "avg" ? nowSum / w.length : nowSum;
      const thenValue = cfg.aggregation === "avg" ? thenSum / w.length : thenSum;
      const delta = deltaPctOf(nowSum, thenSum);

      const spark = dailySeries(idx, cfg.domain, cfg.metric, nowFrom, nowTo);

      // Weekly rollups over the NOW window, oldest → newest.
      const weekly: { label: string; value: number }[] = [];
      let bucketStart = nowFrom;
      while (daysBetween(bucketStart, nowTo) >= 0) {
        const bucketEnd = addDays(bucketStart, Math.min(6, daysBetween(bucketStart, nowTo)));
        weekly.push({
          label: bucketStart,
          value: sumMetric(idx, cfg.domain, cfg.metric, bucketStart, bucketEnd),
        });
        bucketStart = addDays(bucketEnd, 1);
      }
      // THEN reference as a weekly-equivalent (dashed line in the chart).
      const thenAvgWeekly = (thenSum / w.length) * 7;

      rows.push({
        key: cfg.key,
        domain: cfg.domain,
        label: cfg.label,
        thenLabel: formatVersusValue(cfg.format, thenValue),
        nowLabel: formatVersusValue(cfg.format, nowValue),
        unitLabel: cfg.unitLabel,
        deltaPct: delta,
        trend: trendOf(delta),
        spark,
        series: { weekly, thenAvg: thenAvgWeekly },
      });
    }

    out[key] = {
      windowKey: key,
      nowRange: formatRange(nowFrom, nowTo),
      thenRange: formatRange(thenFrom, thenTo),
      rows,
    };
  }
  return out;
}

/* ---- Goal progress / benchmark / gap ---- */

/** Weighted readiness over ASSESSED skills only; null when none assessed. */
function weightedReadiness(): number | null {
  const assessed = SKILLS.filter((x) => x.score !== null);
  if (assessed.length === 0) return null;
  const total = assessed.reduce((s, x) => s + x.weight, 0);
  return assessed.reduce((s, x) => s + (x.score ?? 0) * x.weight, 0) / total;
}

/** Readiness bands — the Level badge, not a grade of the person. */
export function levelOfReadiness(overall: number | null): number {
  if (overall === null) return 1;
  if (overall < 50) return 1;
  if (overall < 80) return 2;
  if (overall < 95) return 3;
  return 4;
}

/** Evidence-based status word per skill (never subjective praise). */
export function statusOfSkill(score: number | null, target: number): string {
  if (score === null) return "Not started";
  if (score >= target) return "Completed";
  if (score / target >= 0.8) return "Proficient";
  return "Learning";
}

export async function getGoalProgress(): Promise<GoalProgress> {
  const idx = await getEventIndex();
  const today = todayKey();
  const readiness = weightedReadiness();
  const overall = readiness === null ? null : Math.round(readiness);

  const active = domainsWithData(idx, today);
  const evidenceDays = (() => {
    let n = 0;
    for (let i = 0; i < 14; i++) {
      if (completionAllOn(idx, addDays(today, -i), active) > 0) n++;
    }
    return n;
  })();

  return {
    overall,
    level: levelOfReadiness(overall),
    targetLabel: TARGET_LABEL,
    skills: await getBenchmarks(),
    updatedLabel: `Updated ${formatMonthDay(today)}`,
    evidenceDays,
  };
}

export async function getBenchmarks(): Promise<SkillBenchmark[]> {
  return SKILLS.map((s) => ({
    skill: s.skill,
    score: s.score,
    target: s.target,
    weight: s.weight,
    gap: s.score === null ? null : s.target - s.score,
    evidence: s.evidence,
    status: statusOfSkill(s.score, s.target),
  }));
}

export async function getGaps(): Promise<GapItem[]> {
  const scored = SKILLS.filter((s) => s.score !== null)
    .map((s) => ({ skill: s.skill, gap: s.target - (s.score ?? 0) }))
    .filter((x) => x.gap > 0)
    .sort((a, b) => b.gap - a.gap);

  const items: GapItem[] = scored.map((x, i) => ({
    rank: i + 1,
    skill: x.skill,
    gapLabel: `${x.gap} pts`,
    note: `~${Math.ceil(x.gap / GAP_PACE_POINTS_PER_WEEK)} weeks at your current pace`,
  }));

  // Unassessed skills follow the scored gaps — honest "establish a
  // baseline" entries, never fabricated scores.
  for (const s of SKILLS.filter((x) => x.score === null)) {
    items.push({
      rank: items.length + 1,
      skill: s.skill,
      gapLabel: "Not assessed",
      note: "Self-assess or connect a data source to establish a baseline.",
    });
  }

  items.push({
    rank: items.length + 1,
    skill: NOT_STARTED_SKILL.skill,
    gapLabel: NOT_STARTED_SKILL.note,
    note: "Pick a first certification or project to establish a baseline.",
  });
  return items;
}

/* ---- Goals ---- */

export async function getGoals(): Promise<GoalRow[]> {
  const idx = await getEventIndex();
  const today = todayKey();
  const last30 = windowRange(PREV_OFFSETS.last30, today);
  const prev30 = windowRange(PREV_OFFSETS.prev30, today);

  return GOAL_ROWS.map((row) => {
    const nowSum = sumMetric(idx, row.domain, row.metric, last30.from, last30.to);
    const thenSum = sumMetric(idx, row.domain, row.metric, prev30.from, prev30.to);
    const delta = deltaPctOf(nowSum, thenSum);
    const isDuration = row.metric.endsWith(".minutes");

    let currentLabel: string;
    let completion: number;
    switch (row.mode) {
      case "avg":
        currentLabel = isDuration ? `${formatDuration(nowSum / 30)} /day` : `${formatCount(nowSum / 30)} words /day`;
        completion = Math.min(1, nowSum / 30 / row.dayGoal);
        break;
      case "weekly":
        currentLabel =
          row.metric === "health.workout.session"
            ? `${formatCount((nowSum * 7) / 30)} sessions /week`
            : `${formatCount((nowSum * 7) / 30)} ${row.metric === "coding.commits" ? "commits" : "tasks"} /week`;
        completion = Math.min(1, (nowSum * 7) / 30 / (row.weeklyGoal ?? 1));
        break;
      case "band": {
        const avg = nowSum / 30;
        currentLabel = `${formatDuration(avg)} /night`;
        completion = avg >= (row.bandMin ?? 0) && avg <= (row.bandMax ?? Infinity) ? 1 : 0.5;
        break;
      }
    }

    const consistency = (len: number) => {
      let met = 0;
      for (let i = 0; i < len; i++) {
        if (completionForGoal(idx, row, addDays(today, -i)) >= 0.8) met++;
      }
      return met / len;
    };

    return {
      key: row.key,
      domain: row.domain,
      label: DOMAIN_META[row.domain].label,
      targetLabel: row.targetLabel,
      currentLabel,
      completion,
      consistency7d: consistency(7),
      consistency30d: consistency(30),
      deltaPct: delta,
      trend: trendOf(delta),
    };
  });
}

/* ---- Heatmap stats ---- */

export async function getHeatmapStats(): Promise<HeatmapStats> {
  const idx = await getEventIndex();
  const today = todayKey();
  const active = domainsWithData(idx, today);

  let active90 = 0;
  let sum90 = 0;
  for (let i = 0; i < 90; i++) {
    const dateKey = addDays(today, -i);
    sum90 += completionAllOn(idx, dateKey, active);
    if (hasAnyEvent(idx, dateKey)) active90++;
  }

  let current = 0;
  for (let i = 0; i < 365; i++) {
    if (hasAnyEvent(idx, addDays(today, -i))) current++;
    else break;
  }

  let longest = 0;
  let run = 0;
  for (let d = DATASET_START; daysBetween(d, today) >= 0; d = addDays(d, 1)) {
    if (hasAnyEvent(idx, d)) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }

  const perDomain = HEATMAP_DOMAINS.map((domain) => {
    let activeDays = 0;
    let sumCompletion = 0;
    for (let d = DATASET_START; daysBetween(d, today) >= 0; d = addDays(d, 1)) {
      if (eventsOn(idx, domain, d).length > 0) {
        activeDays++;
        sumCompletion += completionForDomain(idx, domain, d);
      }
    }
    return {
      domain,
      activeDays,
      avgCompletion: activeDays > 0 ? sumCompletion / activeDays : 0,
    };
  });

  return {
    activeDays90d: active90,
    currentStreak: current,
    longestStreak: longest,
    avgCompletion90d: sum90 / 90,
    perDomain,
  };
}

/* ---- Today ---- */

const METRIC_VALUE_LABELS: Record<string, (v: number, e: LifeEvent) => string> = {
  "learning.study.minutes": (v) => formatDuration(v),
  "learning.reading.minutes": (v) => formatDuration(v),
  "english.words.reviewed": (v) => `${v} words`,
  "english.minutes": (v) => formatDuration(v),
  "english.ielts.mock.band": (v) => `Band ${v}`,
  "health.workout.session": (_v, e) => `${e.metadata.duration_min} min`,
  "health.sleep.minutes": (v) => formatDuration(v),
  "coding.commits": (v) => `${v} commits`,
  "coding.minutes": (v) => formatDuration(v),
  "productivity.tasks.completed": (v) => `${v} task${v === 1 ? "" : "s"}`,
};

const METRIC_LABELS: Record<string, (e: LifeEvent) => string> = {
  "learning.study.minutes": () => "Study time",
  "learning.reading.minutes": () => "Reading",
  "learning.video.minutes": () => "Video",
  "english.words.reviewed": () => "Words reviewed",
  "english.minutes": (e) => (e.metadata.activity === "listening" ? "Listening" : "Speaking"),
  "english.ielts.mock.band": () => "IELTS mock",
  "health.workout.session": (e) => String(e.metadata.type),
  "health.sleep.minutes": () => "Sleep",
  "coding.commits": () => "Commits",
  "coding.minutes": () => "Coding",
  "productivity.tasks.completed": () => "Tasks completed",
  "productivity.focus.minutes": () => "Focus time",
};

export async function getTodaySnapshot(): Promise<TodayItem[]> {
  const idx = await getEventIndex();
  const today = todayKey();
  const todays: LifeEvent[] = [];
  for (const domain of Object.keys(DOMAIN_META) as Domain[]) {
    todays.push(...eventsOn(idx, domain, today));
  }
  return todays
    .sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1))
    .map((e) => ({
      time: formatTime(e.timestamp),
      domain: e.domain,
      metricLabel: METRIC_LABELS[e.metric]?.(e) ?? e.metric,
      valueLabel: METRIC_VALUE_LABELS[e.metric]?.(e.value, e) ?? `${e.value} ${e.unit}`,
      sourceLabel: SOURCE_LABELS[e.source],
      confidence: e.confidence,
    }));
}

/* ---- Insights (real AI rows with M1 sample fallback) ---- */

/** Latest stored insight for a period — the /insights page surface. */
export async function getInsight(period: "week" | "month") {
  return getLatestInsight(period);
}

export interface InsightsPreviewResult {
  /** AI-generated items when live; the M1 sample cards otherwise. */
  items: InsightPreview[];
  live: boolean;
  meta: import("@/data/types").InsightRecord | null;
}

export async function getInsightsPreview(): Promise<InsightsPreviewResult> {
  const insight = await getLatestInsight("week");
  if (insight) {
    return {
      live: true,
      meta: insight,
      items: [
        { title: "FACT", body: insight.content.fact },
        { title: "GAP", body: insight.content.gap },
        { title: "ACTION", body: insight.content.action },
      ],
    };
  }

  const idx = await getEventIndex();
  const today = todayKey();
  const last90 = windowRange(PREV_OFFSETS.last90, today);
  const prev90 = windowRange(PREV_OFFSETS.prev90, today);
  const studyNow = sumMetric(idx, "learning", "learning.study.minutes", last90.from, last90.to);
  const studyThen = sumMetric(idx, "learning", "learning.study.minutes", prev90.from, prev90.to);
  const studyDelta = deltaPctOf(studyNow, studyThen);

  const sleepAvg = sumMetric(idx, "health", "health.sleep.minutes", last90.from, last90.to) / 90;
  const sleepLine =
    sleepAvg >= 390 && sleepAvg <= 450
      ? `Sleep averaged ${formatDuration(sleepAvg)} — within your 6.5–7.5h band.`
      : `Sleep averaged ${formatDuration(sleepAvg)} — slightly outside your 6.5–7.5h band.`;

  return {
    live: false,
    meta: null,
    items: [
      {
        title: "Study trend",
        body:
          studyDelta >= 3
            ? `Study improved ${Math.round(studyDelta)}% over the last 90 days — the strongest trend in your data.`
            : "Study has held steady over the last 90 days.",
      },
      { title: "Sleep", body: sleepLine },
      {
        title: "IELTS Writing",
        body: "IELTS Writing sits below target. 3× 40-min sessions per week would close the gap in about a month.",
      },
    ],
  };
}

/* ---- Next Best Action / header status / data sources ---- */

/** Today's overall goal completion (data-aware mean) — the Daily Goal ring. */
export async function getTodayGoalCompletion(): Promise<number | null> {
  const idx = await getEventIndex();
  const today = todayKey();
  const active = domainsWithData(idx, today);
  if (active.size === 0) return null;
  return completionAllOn(idx, today, active);
}

/**
 * Next Best Action — the closing link of the core loop. Picks the goal
 * row with the LOWEST 30-day completion (skipping no-data rows and the
 * sleep band, which is health-adjacent advice), then quantifies the gap
 * into a concrete step. The reason is always the evidence.
 */
export async function getNextBestAction(): Promise<NextBestAction | null> {
  const idx = await getEventIndex();
  const today = todayKey();
  const last30 = windowRange(PREV_OFFSETS.last30, today);

  let best: { row: (typeof GOAL_ROWS)[number]; completion: number } | null = null;
  for (const row of GOAL_ROWS) {
    if (row.mode === "band") continue;
    const nowSum = sumMetric(idx, row.domain, row.metric, last30.from, last30.to);
    if (nowSum <= 0) continue; // no data → no recommendation
    const completion =
      row.mode === "weekly"
        ? Math.min(1, (nowSum * 7) / 30 / (row.weeklyGoal ?? 1))
        : Math.min(1, nowSum / 30 / row.dayGoal);
    if (completion >= 1) continue;
    if (!best || completion < best.completion) best = { row, completion };
  }
  if (!best) return null;

  const { row, completion } = best;
  const gapPct = Math.round((1 - completion) * 100);
  const isDuration = row.metric.endsWith(".minutes");
  const extra = isDuration
    ? Math.max(5, Math.round((1 - completion) * row.dayGoal))
    : Math.max(1, Math.round((1 - completion) * (row.weeklyGoal ?? 0)));
  return {
    title: isDuration ? `${row.label} · +${extra} min` : `${row.label} · +${extra} more`,
    reason: `${row.label} is ${gapPct}% below its target (${row.targetLabel}) over the last 30 days.`,
    domain: row.domain,
    metric: row.metric,
    minutes: isDuration ? extra : 0,
  };
}

/** Trends tab — 30/90-day deltas per domain primary metric + honesty flag. */
export async function getInsightTrends(): Promise<InsightTrendRow[]> {
  const idx = await getEventIndex();
  const today = todayKey();
  const last30 = windowRange(PREV_OFFSETS.last30, today);
  const prev30 = windowRange(PREV_OFFSETS.prev30, today);
  const last90 = windowRange(PREV_OFFSETS.last90, today);
  const prev90 = windowRange(PREV_OFFSETS.prev90, today);

  const rows: InsightTrendRow[] = [];
  for (const domain of Object.keys(DOMAIN_META) as Domain[]) {
    const meta = DOMAIN_META[domain];
    const now30 = sumMetric(idx, domain, meta.primaryMetric, last30.from, last30.to);
    const then30 = sumMetric(idx, domain, meta.primaryMetric, prev30.from, prev30.to);
    const now90 = sumMetric(idx, domain, meta.primaryMetric, last90.from, last90.to);
    const then90 = sumMetric(idx, domain, meta.primaryMetric, prev90.from, prev90.to);

    let hasReal = false;
    const hasAny = now90 > 0 || then90 > 0;
    for (let d = last90.from; daysBetween(d, last90.to) >= 0 && !hasReal; d = addDays(d, 1)) {
      if (eventsOn(idx, domain, d).some((e) => e.event_id.startsWith("conn:"))) {
        hasReal = true;
      }
    }

    const delta90 = deltaPctOf(now90, then90);
    rows.push({
      domain,
      label: meta.label,
      metric: meta.primaryMetric,
      delta30: deltaPctOf(now30, then30),
      delta90,
      trend90: trendOf(delta90),
      dataState: hasReal ? "has_real_data" : hasAny ? "mock_only" : "no_data",
    });
  }
  return rows;
}

/** Greeting + data-driven status line + formatted date for the header. */
export async function getHeaderStatus(): Promise<HeaderStatus> {
  const idx = await getEventIndex();
  const today = todayKey();
  const last90 = windowRange(PREV_OFFSETS.last90, today);
  const prev90 = windowRange(PREV_OFFSETS.prev90, today);

  // 90-day deltas over data-bearing domains (the line must come from data).
  let total = 0;
  let n = 0;
  for (const domain of Object.keys(DOMAIN_META) as Domain[]) {
    const meta = DOMAIN_META[domain];
    const now = sumMetric(idx, domain, meta.primaryMetric, last90.from, last90.to);
    const then = sumMetric(idx, domain, meta.primaryMetric, prev90.from, prev90.to);
    if (now === 0 && then === 0) continue;
    total += deltaPctOf(now, then);
    n++;
  }
  const avgDelta = n > 0 ? total / n : 0;
  const line =
    avgDelta > 3
      ? "You're ahead of your 90-day self."
      : avgDelta < -3
        ? "You're below your 90-day baseline."
        : "You're holding steady vs your 90-day self.";

  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: LIFEOS_TIMEZONE,
      hour: "numeric",
      hour12: false,
    }).format(new Date())
  );
  const greeting =
    hour < 12 ? "Good morning," : hour < 18 ? "Good afternoon," : "Good evening,";

  return { greeting, line, dateLabel: formatDateLong(today) };
}

/** Connector registry + sync status + trailing-30d event counts. */
export async function getDataSources(): Promise<DataSourceRow[]> {
  return getDataSourcesDb();
}

/* ------------------------------------------------------------------ */

function formatTodayValue(domain: Domain, value: number): string {
  if (domain === "learning" || domain === "health") return formatDuration(value);
  if (domain === "english") return `${value} words`;
  if (domain === "coding") return `${value} commits`;
  if (domain === "productivity") return `${value} task${value === 1 ? "" : "s"}`;
  return `${value}`;
}
