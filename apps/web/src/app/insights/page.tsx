import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Insights" };

export default function InsightsPage() {
  return (
    <>
      <PageHeader title="Insights" />
      <ComingSoon
        title="Insights"
        description="AI-generated, evidence-backed observations — never judgments."
        milestone="M6"
        bullets={[
          "FACT / TREND / GAP / ACTION structure",
          "Weekly and monthly reviews",
          "Sourced from your own data only",
        ]}
      />
    </>
  );
}
