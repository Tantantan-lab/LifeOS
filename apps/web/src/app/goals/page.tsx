import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { GoalProgressHero } from "@/components/home/goal-progress-hero";
import { GoalCards } from "@/components/goals/goal-cards";
import { BenchmarkBars } from "@/components/goals/benchmark-bars";
import { GapList } from "@/components/goals/gap-list";
import {
  getBenchmarks,
  getGaps,
  getGoalProgress,
  getGoals,
} from "@/data/selectors";

export const metadata: Metadata = { title: "Goals" };

export default async function GoalsPage() {
  const [progress, goals, benchmarks, gaps] = await Promise.all([
    getGoalProgress(),
    getGoals(),
    getBenchmarks(),
    getGaps(),
  ]);

  return (
    <>
      <PageHeader
        title="Goals"
        description="Daily and weekly targets, benchmark position, and the gap to close."
      />

      <div className="space-y-5">
        <GoalProgressHero progress={progress} />
        <GoalCards goals={goals} />
        <div className="grid gap-5 xl:grid-cols-2">
          <BenchmarkBars skills={benchmarks} />
          <GapList gaps={gaps} />
        </div>
      </div>
    </>
  );
}
