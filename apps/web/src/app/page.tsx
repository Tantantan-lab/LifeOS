import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { GoalProgressHero } from "@/components/home/goal-progress-hero";
import { NextActionCard } from "@/components/home/next-action-card";
import { DomainRow } from "@/components/home/domain-row";
import { TodayColumn } from "@/components/home/today-column";
import { MeVsMeExplorer } from "@/components/me-vs-me/me-vs-me-explorer";
import { GoalCards } from "@/components/goals/goal-cards";
import { BenchmarkBars } from "@/components/goals/benchmark-bars";
import { GapList } from "@/components/goals/gap-list";
import { InsightsExplorer } from "@/components/insights/insights-explorer";
import { ContributionHeatmap } from "@/components/heatmap/contribution-heatmap";
import { Panel } from "@/components/primitives/panel";
import { SectionHeading } from "@/components/primitives/section-heading";
import {
  getBenchmarks,
  getDomainSummaries,
  getGaps,
  getGoalProgress,
  getGoals,
  getHeaderStatus,
  getHeatmapData,
  getInsight,
  getInsightTrends,
  getMeVsMeAll,
  getNextBestAction,
  getTodayGoalCompletion,
  getTodaySnapshot,
} from "@/data/selectors";

export const metadata: Metadata = { title: "Home" };

export default async function HomePage() {
  const [progress, summaries, heatmap, today, meVsMe, goals, benchmarks,
    gaps, insight, trends, header, todayCompletion, nextAction] =
    await Promise.all([
      getGoalProgress(),
      getDomainSummaries(),
      getHeatmapData(),
      getTodaySnapshot(),
      getMeVsMeAll(),
      getGoals(),
      getBenchmarks(),
      getGaps(),
      getInsight("week"),
      getInsightTrends(),
      getHeaderStatus(),
      getTodayGoalCompletion(),
      getNextBestAction(),
    ]);

  return (
    <div className="space-y-5">
      {/* 0. Data-driven header */}
      <DashboardHeader status={header} />

      {/* 0.5 Decision interface — data → decision → action → new data */}
      {nextAction && <NextActionCard action={nextAction} />}

      {/* 1. How am I doing? */}
      <GoalProgressHero progress={progress} />

      {/* 2. What have I been doing? */}
      <DomainRow summaries={summaries} />

      {/* 3. Contribution + Today */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <SectionHeading
            title="Contribution"
            action={
              <Link
                href="/contribution"
                className="inline-flex items-center gap-1 text-sm text-fg-secondary transition-colors hover:text-fg"
              >
                View full contribution <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          <ContributionHeatmap
            gridStart={heatmap.gridStart}
            days={heatmap.days}
          />
        </Panel>
        <TodayColumn items={today} completion={todayCompletion} />
      </div>

      {/* 4. Me vs Me — the full explorer, identical to /me-vs-me */}
      <MeVsMeExplorer windows={meVsMe} />

      {/* 5. Goals — full cards + benchmark + gap, identical to /goals */}
      <GoalCards goals={goals} />
      <div className="grid gap-5 xl:grid-cols-2">
        <BenchmarkBars skills={benchmarks} />
        <GapList gaps={gaps} />
      </div>

      {/* 6. Insights — the full explorer, identical to /insights */}
      <InsightsExplorer
        insight={insight}
        trends={trends}
        gaps={gaps}
        period="week"
      />
    </div>
  );
}
