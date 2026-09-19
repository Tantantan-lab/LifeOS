import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Today" };

export default function TodayPage() {
  return (
    <>
      <PageHeader title="Today" />
      <ComingSoon
        title="Today"
        description="A single-day timeline of everything logged, with quick manual entry."
        milestone="M3"
        bullets={[
          "Timeline of every event logged today",
          "Manual entry for study, English, fitness, coding",
          "Domain totals vs daily goals",
        ]}
      />
    </>
  );
}
