import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Data Sources" };

export default function DataSourcesPage() {
  return (
    <>
      <PageHeader title="Data Sources" />
      <ComingSoon
        title="Data Sources"
        description="Connector health: GitHub, Apple Health, Anki, Hevy, manual entry."
        milestone="M4 / M5"
        bullets={[
          "Every source normalizes into the unified Event stream",
          "Sync status and confidence per connector",
          "Private by default — nothing leaves your account",
        ]}
      />
    </>
  );
}
