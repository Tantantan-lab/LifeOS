import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { InsightsExplorer } from "@/components/insights/insights-explorer";
import { PeriodToggle } from "@/components/insights/period-toggle";
import { getGaps, getInsight, getInsightTrends } from "@/data/selectors";

export const metadata: Metadata = { title: "Insights" };

const VALID_TABS = ["summary", "trends", "gaps", "analysis"] as const;

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; tab?: string }>;
}) {
  const { period: periodParam, tab: tabParam } = await searchParams;
  const period = periodParam === "month" ? "month" : "week";
  const tab = (VALID_TABS as readonly string[]).includes(tabParam ?? "")
    ? (tabParam as (typeof VALID_TABS)[number])
    : "summary";

  const [insight, trends, gaps] = await Promise.all([
    getInsight(period),
    getInsightTrends(),
    getGaps(),
  ]);

  return (
    <>
      <PageHeader
        title="Insights"
        description="Evidence-backed observations — never judgments."
      >
        <PeriodToggle period={period} tab={tab} />
      </PageHeader>

      <InsightsExplorer
        insight={insight}
        trends={trends}
        gaps={gaps}
        period={period}
        initialTab={tab}
      />
    </>
  );
}
