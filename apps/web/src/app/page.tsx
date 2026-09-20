import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { GoalProgressHero } from "@/components/home/goal-progress-hero";
import { NextActionCard } from "@/components/home/next-action-card";
import { DomainRow } from "@/components/home/domain-row";
import { TodayColumn } from "@/components/home/today-column";
import { MeVsMeSummary } from "@/components/home/me-vs-me-summary";
import { GoalsSummary } from "@/components/home/goals-summary";
import { InsightsPreview } from "@/components/home/insights-preview";
import { ContributionHeatmap } from "@/components/heatmap/contribution-heatmap";
import { Panel } from "@/components/primitives/panel";
import { SectionHeading } from "@/components/primitives/section-heading";
import { HEATMAP_CAPTION } from "@/lib/copy";
import {
  getDomainSummaries,
  getGoalProgress,
  getGoals,
  getHeaderStatus,
  getHeatmapData,
  getInsightsPreview,
  getMeVsMeAll,
  getNextBestAction,
  getTodayGoalCompletion,
  getTodaySnapshot,
} from "@/data/selectors";

export const metadata: Metadata = { title: "Home" };

export default async function HomePage() {
  const [progress, summaries, heatmap, today, meVsMe, goals, insights,
    header, todayCompletion, nextAction] =
    await Promise.all([
      getGoalProgress(),
      getDomainSummaries(),
      getHeatmapData(),
      getTodaySnapshot(),
      getMeVsMeAll(),
      getGoals(),
      getInsightsPreview(),
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
            size="sm"
            showTabs={false}
            showLegend={false}
          />
          <div className="mt-3 text-micro text-fg-muted">{HEATMAP_CAPTION}</div>
        </Panel>
        <TodayColumn items={today} completion={todayCompletion} />
      </div>

      {/* 4. Me vs Me · Goals · Insights */}
      <div className="grid gap-5 md:grid-cols-3">
        <MeVsMeSummary window={meVsMe["30D"]} />
        <GoalsSummary goals={goals} />
        <InsightsPreview insights={insights} />
      </div>
    </div>
  );
}
