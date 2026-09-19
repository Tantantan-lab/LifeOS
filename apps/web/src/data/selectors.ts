/**
 * The query surface every page reads from — and the single M2 swap seam:
 * replacing these function bodies with fetch() calls must not touch any
 * component. All functions are async by contract even though the mock
 * dataset is synchronous.
 *
 * Rules:
 *  - Components import ONLY from this file (never generator/events).
 *  - All date math happens here; components receive date strings only.
 */

import {
  ANCHOR_DATE,
  DOMAIN_META,
  GAP_PACE_POINTS_PER_WEEK,
  HEATMAP_DOMAINS,
  NOT_STARTED_SKILL,
  SKILLS,
  TARGET_LABEL,
  WINDOWS,
  WINDOW_ORDER,
} from "@/data/constants";
import { EVENTS } from "@/data/events";
import type {
  Domain,
  DomainSummary,
  GapItem,
  GoalProgress,
  GoalRow,
  HeatmapDay,
  HeatmapDayCell,
  HeatmapDomain,
  HeatmapStats,
  InsightPreview,
  Level,
  LifeEvent,
  MeVsMeWindow,
  SkillBenchmark,
  TodayItem,
  Trend,
  VersusRow,
  WindowKey,
} from "@/data/types";
import { addDays, daysBetween, formatRange, sundayOnOrBefore } from "@/lib/dates";
import { formatCount, formatDuration, formatHours1, formatMonthDay, formatTime } from "@/lib/format";
import { SOURCE_LABELS } from "@/lib/copy";

/* ------------------------------------------------------------------ */
/* Event index                                                         */
/* ------------------------------------------------------------------ */

const dateOf = (timestamp: string) => timestamp.slice(0, 10);

const eventIndex = (() => {
  const idx = new Map<Domain, Map<string, LifeEvent[]>>();
  for (const e of EVENTS) {
    const day = dateOf(e.timestamp);
    const dayMap = idx.get(e.domain) ?? new Map();
    const list = dayMap.get(day) ?? [];
    list.push(e);
    dayMap.set(day, list);
    idx.set(e.domain, dayMap);
  }
  return idx;
})();

function eventsOn(domain: Domain, dateKey: string) {
  return eventIndex.get(domain)?.get(dateKey) ?? [];
}

function metricValueOn(domain: Domain, metric: string, dateKey: string): number {
  return eventsOn(domain, dateKey)
    .filter((e) => e.metric === metric)
    .reduce((sum, e) => sum + e.value, 0);
}

function sumMetric(domain: Domain, metric: string, from: string, to: string): number {
  let sum = 0;
  for (let d = daysBetween(ANCHOR_DATE, from); d <= daysBetween(ANCHOR_DATE, to); d++) {
    sum += metricValueOn(domain, metric, addDays(ANCHOR_DATE, d));
  }
  return sum;
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
function completionForDomain(domain: HeatmapDomain, dateKey: string): number {
  const meta = DOMAIN_META[domain];
  if (meta.goalMode === "day") {
    return Math.min(1, metricValueOn(domain, meta.primaryMetric, dateKey) / meta.dayGoal);
  }
  const total = sumMetric(domain, meta.primaryMetric, addDays(dateKey, -6), dateKey);
  return Math.min(1, total / (meta.weeklyGoal ?? 1));
}

function completionAllOn(dateKey: string): number {
  return HEATMAP_DOMAINS.reduce((sum, d) => sum + completionForDomain(d, dateKey), 0) / HEATMAP_DOMAINS.length;
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

const FIRST_DATE = addDays(ANCHOR_DATE, -364);
const GRID_START = sundayOnOrBefore(FIRST_DATE); // 2025-09-14

const LAST_30 = { from: addDays(ANCHOR_DATE, -29), to: ANCHOR_DATE };
const PREV_30 = { from: addDays(ANCHOR_DATE, -59), to: addDays(ANCHOR_DATE, -30) };
const LAST_90 = { from: addDays(ANCHOR_DATE, -89), to: ANCHOR_DATE };
const PREV_90 = { from: addDays(ANCHOR_DATE, -179), to: addDays(ANCHOR_DATE, -90) };

/** Daily values of a metric over a window (oldest → newest). */
function dailySeries(domain: Domain, metric: string, from: string, to: string): number[] {
  const out: number[] = [];
  for (let d = daysBetween(ANCHOR_DATE, from); d <= daysBetween(ANCHOR_DATE, to); d++) {
    out.push(metricValueOn(domain, metric, addDays(ANCHOR_DATE, d)));
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Selectors                                                           */
/* ------------------------------------------------------------------ */

export async function getDomainSummaries(): Promise<DomainSummary[]> {
  const domains = Object.keys(DOMAIN_META) as Domain[];
  return domains.map((domain) => {
    const meta = DOMAIN_META[domain];
    const nowSum = sumMetric(domain, meta.primaryMetric, LAST_30.from, LAST_30.to);
    const thenSum = sumMetric(domain, meta.primaryMetric, PREV_30.from, PREV_30.to);
    const delta = deltaPctOf(nowSum, thenSum);

    let headline: string;
    switch (domain) {
      case "study":
        headline = formatDuration(nowSum / 30);
        break;
      case "sleep":
        headline = formatDuration(nowSum / 30);
        break;
      case "fitness":
      case "coding":
        headline = formatCount((nowSum * 7) / 30);
        break;
      case "english":
        headline = formatCount(nowSum / 30);
        break;
    }

    const spark = dailySeries(domain, meta.primaryMetric, LAST_30.from, LAST_30.to);

    const isHeatmapDomain = HEATMAP_DOMAINS.includes(domain as HeatmapDomain);
    const todayCompletion = isHeatmapDomain
      ? completionForDomain(domain as HeatmapDomain, ANCHOR_DATE)
      : null;
    const todayValue = metricValueOn(domain, meta.primaryMetric, ANCHOR_DATE);
    const todayValueLabel =
      todayValue > 0 ? formatTodayValue(domain, meta.primaryMetric, todayValue) : null;

    return {
      domain,
      headline,
      unitLabel: meta.unitLabel,
      deltaPct: delta,
      trend: trendOf(delta),
      spark,
      todayCompletion,
      todayValueLabel,
    };
  });
}

export async function getHeatmapData(): Promise<{ gridStart: string; days: HeatmapDay[] }> {
  const days: HeatmapDay[] = [];
  for (let i = 0; i < 365; i++) {
    const dateKey = addDays(FIRST_DATE, i);
    const cells = {} as Record<HeatmapDomain, HeatmapDayCell>;
    for (const domain of HEATMAP_DOMAINS) {
      const completion = completionForDomain(domain, dateKey);
      const meta = DOMAIN_META[domain];
      const value = metricValueOn(domain, meta.primaryMetric, dateKey);
      const displayValue =
        meta.goalMode === "trailing7"
          ? sumMetric(domain, meta.primaryMetric, addDays(dateKey, -6), dateKey)
          : value;
      cells[domain] = { completion, level: levelOf(completion), value, displayValue };
    }
    const completionAll = completionAllOn(dateKey);
    days.push({
      date: dateKey,
      completionAll,
      levelAll: levelOf(completionAll),
      ...cells,
    });
  }
  return { gridStart: GRID_START, days };
}

/* ---- Me vs Me ---- */

const VERSUS: Record<
  Domain,
  { metric: string; aggregation: "sum" | "avg"; format: "duration" | "hours1" | "count"; unitLabel: string }
> = {
  study: { metric: "study_minutes", aggregation: "avg", format: "duration", unitLabel: "/day" },
  english: { metric: "vocabulary_review", aggregation: "avg", format: "count", unitLabel: "/day" },
  fitness: { metric: "workout_session", aggregation: "sum", format: "count", unitLabel: "sessions" },
  coding: { metric: "coding_minutes", aggregation: "sum", format: "hours1", unitLabel: "" },
  sleep: { metric: "sleep_minutes", aggregation: "avg", format: "duration", unitLabel: "/night" },
};

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
  const out = {} as Record<WindowKey, MeVsMeWindow>;

  for (const key of WINDOW_ORDER) {
    const w = WINDOWS[key];
    const nowFrom = addDays(ANCHOR_DATE, -w.nowStartOffset);
    const nowTo = ANCHOR_DATE;
    const thenFrom = addDays(ANCHOR_DATE, -w.thenStartOffset);
    const thenTo = addDays(ANCHOR_DATE, -w.thenStartOffset + w.length - 1);

    const rows: VersusRow[] = (Object.keys(VERSUS) as Domain[]).map((domain) => {
      const cfg = VERSUS[domain];
      const nowSum = sumMetric(domain, cfg.metric, nowFrom, nowTo);
      const thenSum = sumMetric(domain, cfg.metric, thenFrom, thenTo);
      const nowValue = cfg.aggregation === "avg" ? nowSum / w.length : nowSum;
      const thenValue = cfg.aggregation === "avg" ? thenSum / w.length : thenSum;
      const delta = deltaPctOf(nowSum, thenSum);

      const spark = dailySeries(domain, cfg.metric, nowFrom, nowTo);

      // Weekly rollups over the NOW window, oldest → newest.
      const weekly: { label: string; value: number }[] = [];
      let bucketStart = nowFrom;
      while (daysBetween(bucketStart, nowTo) >= 0) {
        const bucketEnd = addDays(bucketStart, Math.min(6, daysBetween(bucketStart, nowTo)));
        weekly.push({
          label: bucketStart,
          value: sumMetric(domain, cfg.metric, bucketStart, bucketEnd),
        });
        bucketStart = addDays(bucketEnd, 1);
      }
      // THEN reference as a weekly-equivalent (dashed line in the chart).
      const thenAvgWeekly = (thenSum / w.length) * 7;

      return {
        domain,
        metricLabel: DOMAIN_META[domain].metricLabel,
        thenLabel: formatVersusValue(cfg.format, thenValue),
        nowLabel: formatVersusValue(cfg.format, nowValue),
        unitLabel: cfg.unitLabel,
        deltaPct: delta,
        trend: trendOf(delta),
        spark,
        series: { weekly, thenAvg: thenAvgWeekly },
      };
    });

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

function weightedReadiness(): number {
  const total = SKILLS.reduce((s, x) => s + x.weight, 0);
  return SKILLS.reduce((s, x) => s + x.score * x.weight, 0) / total;
}

export async function getGoalProgress(): Promise<GoalProgress> {
  const overall = Math.round(weightedReadiness());

  // Dev-only guard: the hero number is a spec'd value (72%); drift must fail loudly.
  if (process.env.NODE_ENV !== "production" && overall !== 72) {
    throw new Error(`GoalProgress drift: weighted readiness = ${overall}, expected 72`);
  }

  const evidenceDays = (() => {
    let n = 0;
    for (let i = 0; i < 14; i++) {
      if (completionAllOn(addDays(ANCHOR_DATE, -i)) > 0) n++;
    }
    return n;
  })();

  return {
    overall,
    targetLabel: TARGET_LABEL,
    skills: await getBenchmarks(),
    updatedLabel: `Updated ${formatMonthDay(ANCHOR_DATE)}`,
    evidenceDays,
  };
}

export async function getBenchmarks(): Promise<SkillBenchmark[]> {
  return SKILLS.map((s) => ({
    skill: s.skill,
    score: s.score,
    target: s.target,
    weight: s.weight,
    gap: s.target - s.score,
    evidence: s.evidence,
  }));
}

export async function getGaps(): Promise<GapItem[]> {
  const scored = SKILLS.map((s) => ({ skill: s.skill, gap: s.target - s.score }))
    .filter((x) => x.gap > 0)
    .sort((a, b) => b.gap - a.gap);

  const items: GapItem[] = scored.map((x, i) => ({
    rank: i + 1,
    skill: x.skill,
    gapLabel: `${x.gap} pts`,
    note: `~${Math.ceil(x.gap / GAP_PACE_POINTS_PER_WEEK)} weeks at your current pace`,
  }));

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
  const domains = Object.keys(DOMAIN_META) as Domain[];
  return domains.map((domain) => {
    const meta = DOMAIN_META[domain];
    const nowSum = sumMetric(domain, meta.primaryMetric, LAST_30.from, LAST_30.to);
    const thenSum = sumMetric(domain, meta.primaryMetric, PREV_30.from, PREV_30.to);
    const delta = deltaPctOf(nowSum, thenSum);

    let currentLabel: string;
    let completion: number;
    switch (domain) {
      case "study":
        currentLabel = `${formatDuration(nowSum / 30)} /day`;
        completion = Math.min(1, nowSum / 30 / meta.dayGoal);
        break;
      case "english":
        currentLabel = `${formatCount(nowSum / 30)} words /day`;
        completion = Math.min(1, nowSum / 30 / meta.dayGoal);
        break;
      case "fitness":
        currentLabel = `${formatCount((nowSum * 7) / 30)} sessions /week`;
        completion = Math.min(1, (nowSum * 7) / 30 / (meta.weeklyGoal ?? 1));
        break;
      case "coding":
        currentLabel = `${formatCount((nowSum * 7) / 30)} commits /week`;
        completion = Math.min(1, (nowSum * 7) / 30 / (meta.weeklyGoal ?? 1));
        break;
      case "sleep": {
        const avg = nowSum / 30;
        currentLabel = `${formatDuration(avg)} /night`;
        completion = avg >= 390 && avg <= 450 ? 1 : Math.min(1, Math.max(0, 1 - Math.abs(avg - 420) / 60));
        break;
      }
    }

    const consistency = (len: number) => {
      let met = 0;
      for (let i = 0; i < len; i++) {
        const dateKey = addDays(ANCHOR_DATE, -i);
        if (domain === "sleep") {
          const v = metricValueOn(domain, meta.primaryMetric, dateKey);
          if (v >= 390 && v <= 450) met++;
        } else if (completionForDomain(domain as HeatmapDomain, dateKey) >= 0.8) {
          met++;
        }
      }
      return met / len;
    };

    return {
      domain,
      targetLabel: meta.goalLabel,
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
  let active90 = 0;
  let sum90 = 0;
  for (let i = 0; i < 90; i++) {
    const c = completionAllOn(addDays(ANCHOR_DATE, -i));
    sum90 += c;
    if (c > 0) active90++;
  }

  let current = 0;
  for (let i = 0; i < 365; i++) {
    if (completionAllOn(addDays(ANCHOR_DATE, -i)) > 0) current++;
    else break;
  }

  let longest = 0;
  let run = 0;
  for (let i = 0; i < 365; i++) {
    const dateKey = addDays(FIRST_DATE, i);
    if (completionAllOn(dateKey) > 0) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }

  const perDomain = HEATMAP_DOMAINS.map((domain) => {
    let activeDays = 0;
    let sumCompletion = 0;
    for (let i = 0; i < 365; i++) {
      const c = completionForDomain(domain, addDays(FIRST_DATE, i));
      if (c > 0) {
        activeDays++;
        sumCompletion += c;
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
  study_minutes: (v) => formatDuration(v),
  vocabulary_review: (v) => `${v} words`,
  english_minutes: (v) => formatDuration(v),
  ielts_mock_band: (v) => `Band ${v}`,
  workout_session: (_v, e) => `${e.metadata.type} · ${e.metadata.duration_min} min`,
  coding_commits: (v) => `${v} commits`,
  coding_minutes: (v) => formatDuration(v),
  sleep_minutes: (v) => formatDuration(v),
};

const METRIC_LABELS: Record<string, (e: LifeEvent) => string> = {
  study_minutes: () => "Study",
  vocabulary_review: () => "Vocabulary review",
  english_minutes: (e) => (e.metadata.activity === "listening" ? "Listening" : "Speaking"),
  ielts_mock_band: () => "IELTS mock",
  workout_session: (e) => String(e.metadata.type),
  coding_commits: () => "Commits",
  coding_minutes: () => "Coding",
  sleep_minutes: () => "Sleep",
};

export async function getTodaySnapshot(): Promise<TodayItem[]> {
  return EVENTS.filter((e) => dateOf(e.timestamp) === ANCHOR_DATE)
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

/* ---- Insights preview (real numbers, sample badge) ---- */

export async function getInsightsPreview(): Promise<InsightPreview[]> {
  const studyNow = sumMetric("study", "study_minutes", LAST_90.from, LAST_90.to);
  const studyThen = sumMetric("study", "study_minutes", PREV_90.from, PREV_90.to);
  const studyDelta = deltaPctOf(studyNow, studyThen);

  const sleepAvg = sumMetric("sleep", "sleep_minutes", LAST_30.from, LAST_30.to) / 30;
  const sleepLine =
    sleepAvg >= 390 && sleepAvg <= 450
      ? `Sleep averaged ${formatDuration(sleepAvg)} — within your 6.5–7.5h band.`
      : `Sleep averaged ${formatDuration(sleepAvg)} — slightly outside your 6.5–7.5h band.`;

  return [
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
  ];
}

/* ------------------------------------------------------------------ */

function formatTodayValue(domain: Domain, metric: string, value: number): string {
  if (domain === "study" || domain === "sleep") return formatDuration(value);
  if (domain === "english") return `${value} words`;
  if (domain === "fitness") return `${value} session${value === 1 ? "" : "s"}`;
  if (domain === "coding") return `${value} commits`;
  return `${value}`;
}
