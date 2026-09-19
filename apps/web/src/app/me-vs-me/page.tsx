import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { MeVsMeExplorer } from "@/components/me-vs-me/me-vs-me-explorer";
import { getMeVsMeAll } from "@/data/selectors";

export const metadata: Metadata = { title: "Me vs Me" };

export default async function MeVsMePage() {
  const windows = await getMeVsMeAll();

  return (
    <>
      <PageHeader
        title="Me vs Me"
        description="Your only benchmark is your past. The rest of the world just sets the coordinates."
      />
      <MeVsMeExplorer windows={windows} />
    </>
  );
}
