import type { Metadata } from "next";
import { ContributionView } from "@/components/contribution/contribution-view";
import { getHeatmapData, getHeatmapStats } from "@/data/selectors";

export const metadata: Metadata = { title: "Contribution" };

export default async function ContributionPage() {
  const [heatmap, stats] = await Promise.all([getHeatmapData(), getHeatmapStats()]);

  return (
    <ContributionView
      gridStart={heatmap.years[heatmap.currentYear].gridStart}
      days={heatmap.years[heatmap.currentYear].days}
      stats={stats}
    />
  );
}
