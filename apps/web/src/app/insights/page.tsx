import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { InsightsClient } from "@/components/insights/insights-client";
import { PeriodToggle } from "@/components/insights/period-toggle";
import { getGaps, getInsight, getInsightTrends } from "@/data/selectors";

export const metadata: Metadata = { title: "Insights" };

export default async function InsightsPage() {
  // Both periods prerender once (static-export friendly); the client only
  // switches between them via search params.
  const [weekInsight, monthInsight, trends, gaps] = await Promise.all([
    getInsight("week"),
    getInsight("month"),
    getInsightTrends(),
    getGaps(),
  ]);

  return (
    <>
      <PageHeader
        title="Insights"
        description="Evidence-backed observations — never judgments."
      >
        <Suspense>
          <PeriodToggle />
        </Suspense>
      </PageHeader>

      <Suspense>
        <InsightsClient
          weekInsight={weekInsight}
          monthInsight={monthInsight}
          trends={trends}
          gaps={gaps}
        />
      </Suspense>
    </>
  );
}
