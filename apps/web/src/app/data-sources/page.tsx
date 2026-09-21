import type { Metadata } from "next";
import { DataSourcesView } from "@/components/data-sources/data-sources-view";
import { getDataSources } from "@/data/selectors";

export const metadata: Metadata = { title: "Data Sources" };

export default async function DataSourcesPage() {
  const sources = await getDataSources();
  return <DataSourcesView sources={sources} />;
}
