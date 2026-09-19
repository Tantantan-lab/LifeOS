import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <ComingSoon
        title="Settings"
        description="Goals, targets, connector credentials, timezone."
        milestone="M2 / M3"
        bullets={[
          "Per-domain daily and weekly targets",
          "Benchmark target selection (e.g. Overseas Engineer)",
          "Data export and deletion",
        ]}
      />
    </>
  );
}
