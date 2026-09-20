import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { TodayColumn } from "@/components/home/today-column";
import { NextActionCard } from "@/components/home/next-action-card";
import {
  getNextBestAction,
  getTodayGoalCompletion,
  getTodaySnapshot,
} from "@/data/selectors";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage() {
  const [items, completion, action] = await Promise.all([
    getTodaySnapshot(),
    getTodayGoalCompletion(),
    getNextBestAction(),
  ]);

  return (
    <>
      <PageHeader title="Today" />
      <div className="max-w-2xl space-y-5">
        {action && <NextActionCard action={action} />}
        <TodayColumn items={items} completion={completion} />
      </div>
    </>
  );
}
