/**
 * Static demo dataset — the "写死一个数据" mode (no database).
 *
 * Everything here is deterministic: the mock generator (365 frozen days
 * ending MOCK_LAST_DATE) feeds the event index, and the insight records are
 * built from that same stream via the pipeline's template rules (numbers
 * from scripts/demo-summary.ts). No secrets, no live data — the UI badges
 * this as "Demo data".
 *
 * Server-side only: db.ts injects these behind the selectors; components
 * keep reading selectors (rule 1 untouched).
 */

import { generateEvents } from "../../scripts/generator";
import type { DataSourceRow, InsightRecord, LifeEvent } from "@/data/types";

let eventsCache: LifeEvent[] | null = null;

/** Deterministic 365-day mock stream — byte-identical on every call. */
export function getDemoEvents(): LifeEvent[] {
  if (!eventsCache) eventsCache = generateEvents();
  return eventsCache;
}

/**
 * Insight snapshots built from the demo generator stream via the SAME
 * template rules as the API pipeline (numbers from `scripts/demo-summary.ts`
 * over generateEvents(), windows ending at the demo "today" 2026-09-19).
 * Every sentence's numbers match what the site's charts render.
 */
export const DEMO_INSIGHTS: Record<"week" | "month", InsightRecord> = {
  week: {
    period: "week",
    periodStart: "2026-09-13",
    periodEnd: "2026-09-19",
    provider: "typesafe",
    model: "jev-1.13.0",
    createdAt: "2026-09-19T12:00:00.000Z",
    content: {
      fact: {
        en: "Workouts: 4 sessions this week, +300% vs the previous week.",
        zh: "训练：本周 4 次，比上周 +300%。",
      },
      trend: {
        en: "Vocabulary: -17% this week vs +57% over 90 days.",
        zh: "词汇：本周 -17%，过去 90 天 +57%。",
      },
      gap: {
        en: "Study time: 19 min/day short of the 120 min/day goal.",
        zh: "学习时长：距每天 120 分钟目标还差 19 分钟。",
      },
      action: {
        en: "Study time: add about 19 min/day to reach the 120 min/day goal.",
        zh: "学习时长：每天再增加约 19 分钟，达到每天 120 分钟目标。",
      },
    },
  },
  month: {
    period: "month",
    periodStart: "2026-08-21",
    periodEnd: "2026-09-19",
    provider: "typesafe",
    model: "jev-1.13.0",
    createdAt: "2026-09-19T12:00:00.000Z",
    content: {
      fact: {
        en: "Study time: 2542 min this month, +36% vs the previous month.",
        zh: "学习时长：本月 2542 分钟，比上个月 +36%。",
      },
      trend: {
        en: "Vocabulary over 90 days: +57%.",
        zh: "词汇 过去 90 天：+57%。",
      },
      gap: {
        en: "Study time: 35 min/day short of the 120 min/day goal.",
        zh: "学习时长：距每天 120 分钟目标还差 35 分钟。",
      },
      action: {
        en: "Study time: add about 35 min/day to reach the 120 min/day goal.",
        zh: "学习时长：每天再增加约 35 分钟，达到每天 120 分钟目标。",
      },
    },
  },
};

/** The demo never had a header top pick (single real domain at snapshot time). */
export const DEMO_INSIGHT_META: Record<string, unknown> = { top: null };

/** Connector cards — honest demo state: no live connectors on a static site. */
export const DEMO_DATA_SOURCES: DataSourceRow[] = [
  { source: "github", label: "GitHub", connected: false, lastSyncAt: null, events30d: 0, isConnector: true },
  { source: "weread", label: "WeRead", connected: false, lastSyncAt: null, events30d: 0, isConnector: true },
  { source: "maimemo", label: "Maimemo", connected: false, lastSyncAt: null, events30d: 0, isConnector: true },
  { source: "ticktick", label: "TickTick", connected: false, lastSyncAt: null, events30d: 0, isConnector: true },
];
