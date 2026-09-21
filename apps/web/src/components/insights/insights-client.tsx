"use client";

import { useSearchParams } from "next/navigation";
import { InsightsExplorer } from "@/components/insights/insights-explorer";
import type { GapItem, InsightRecord, InsightTrendRow } from "@/data/types";

const VALID_TABS = ["summary", "trends", "gaps", "analysis"] as const;

/** Client-side tab/period state — the page prerenders with both periods'
 * data; search params only switch which one is shown. Wrap in <Suspense>
 * at the call site (useSearchParams requires it during prerender). */
export function InsightsClient({
  weekInsight,
  monthInsight,
  trends,
  gaps,
}: {
  weekInsight: InsightRecord | null;
  monthInsight: InsightRecord | null;
  trends: InsightTrendRow[];
  gaps: GapItem[];
}) {
  const params = useSearchParams();
  const period = params?.get("period") === "month" ? "month" : "week";
  const tabParam = params?.get("tab") ?? "";
  const tab = (VALID_TABS as readonly string[]).includes(tabParam)
    ? (tabParam as (typeof VALID_TABS)[number])
    : "summary";

  return (
    <InsightsExplorer
      insight={period === "month" ? monthInsight : weekInsight}
      trends={trends}
      gaps={gaps}
      period={period}
      initialTab={tab}
    />
  );
}
