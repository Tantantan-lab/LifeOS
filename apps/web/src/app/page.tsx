import type { Metadata } from "next";
import { ReferenceDashboard } from "@/components/home/reference-dashboard";
import {
  getCardSeries,
  getDomainSummaries,
  getGaps,
  getGoalProgress,
  getGoals,
  getHeaderStatus,
  getHeatmapData,
  getHeatmapStats,
  getInsight,
  getInsightTrends,
  getMeVsMeAll,
  getNextBestAction,
  getTodayGoalCompletion,
  getTodaySnapshot,
} from "@/data/selectors";

export const metadata: Metadata = { title: "Home" };

export default async function HomePage() {
  const [progress, summaries, heatmap, heatmapStats, today, meVsMe, goals,
    gaps, insight, trends, header, todayCompletion, nextAction, cardSeries] = await Promise.all([
      getGoalProgress(), getDomainSummaries(), getHeatmapData(), getHeatmapStats(),
      getTodaySnapshot(), getMeVsMeAll(), getGoals(), getGaps(), getInsight("month"),
      getInsightTrends(), getHeaderStatus(), getTodayGoalCompletion(), getNextBestAction(),
      getCardSeries(),
    ]);

  return <ReferenceDashboard data={{
    progress, summaries, heatmap, heatmapStats, today, meVsMe, goals, gaps,
    insight, trends, header, todayCompletion, nextAction, cardSeries,
  }} />;
}
