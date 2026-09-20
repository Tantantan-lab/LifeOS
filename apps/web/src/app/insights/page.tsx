import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Panel } from "@/components/primitives/panel";
import { DomainDot } from "@/components/primitives/domain-chip";
import { MetricDelta } from "@/components/primitives/metric-delta";
import { GapList } from "@/components/goals/gap-list";
import { getGaps, getInsight, getInsightTrends } from "@/data/selectors";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Insights" };

const TABS = [
  { key: "summary", label: "Summary" },
  { key: "trends", label: "Trends" },
  { key: "gaps", label: "Gaps" },
  { key: "analysis", label: "AI Analysis" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const SECTIONS: { key: "fact" | "trend" | "gap" | "action"; label: string; description: string }[] = [
  { key: "fact", label: "FACT", description: "What the data says." },
  { key: "trend", label: "TREND", description: "Direction over 30/90 days." },
  { key: "gap", label: "GAP", description: "Distance to your own goals." },
  { key: "action", label: "ACTION", description: "One concrete next step." },
];

const DATA_STATE_LABEL: Record<string, string> = {
  has_real_data: "real data",
  mock_only: "sample history",
  no_data: "no data yet",
};

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; tab?: string }>;
}) {
  const { period: periodParam, tab: tabParam } = await searchParams;
  const period = periodParam === "month" ? "month" : "week";
  const tab: TabKey = (TABS.some((t) => t.key === tabParam) ? tabParam : "summary") as TabKey;

  const [insight, trends, gaps] = await Promise.all([
    getInsight(period),
    getInsightTrends(),
    getGaps(),
  ]);

  return (
    <>
      <PageHeader
        title="Insights"
        description="Evidence-backed observations — never judgments."
      >
        <Link
          href={`/insights?period=${period === "week" ? "month" : "week"}&tab=${tab}`}
          className="rounded-full border border-border px-3 py-1 text-sm text-fg-secondary transition-colors hover:text-fg"
        >
          {period === "week" ? "Monthly" : "Weekly"}
        </Link>
      </PageHeader>

      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-border pb-px">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/insights?tab=${t.key}&period=${period}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2 text-sm transition-colors",
              tab === t.key
                ? "border-brand text-fg"
                : "border-transparent text-fg-secondary hover:text-fg"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "summary" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {trends.map((row) => (
            <Panel key={row.metric} tight>
              <div className="flex items-center gap-2">
                <DomainDot domain={row.domain} />
                <span className="text-sm text-fg-secondary">{row.label}</span>
                <span className="ml-auto text-micro text-fg-muted">
                  {DATA_STATE_LABEL[row.dataState]}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-3">
                <MetricDelta deltaPct={row.delta30} trend={trendOfPct(row.delta30)} className="text-sm" />
                <span className="text-micro text-fg-muted">30 days</span>
                <MetricDelta deltaPct={row.delta90} trend={row.trend90} className="text-sm" />
                <span className="text-micro text-fg-muted">90 days</span>
              </div>
            </Panel>
          ))}
        </div>
      )}

      {tab === "trends" && (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-micro uppercase tracking-[0.1em] text-fg-muted">
                  <th className="pb-2 font-normal">Domain</th>
                  <th className="pb-2 font-normal">30 days</th>
                  <th className="pb-2 font-normal">90 days</th>
                  <th className="pb-2 font-normal">Data</th>
                </tr>
              </thead>
              <tbody>
                {trends.map((row) => (
                  <tr key={row.metric} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5">
                      <span className="inline-flex items-center gap-2">
                        <DomainDot domain={row.domain} />
                        <span className="text-fg-secondary">{row.label}</span>
                      </span>
                    </td>
                    <td className="num py-2.5">
                      <MetricDelta deltaPct={row.delta30} trend={trendOfPct(row.delta30)} />
                    </td>
                    <td className="num py-2.5">
                      <MetricDelta deltaPct={row.delta90} trend={row.trend90} />
                    </td>
                    <td className="py-2.5 text-micro text-fg-muted">
                      {DATA_STATE_LABEL[row.dataState]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {tab === "gaps" && (
        <div className="max-w-2xl">
          <GapList gaps={gaps} />
        </div>
      )}

      {tab === "analysis" && (
        insight === null ? (
          <Panel className="max-w-2xl">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-fg-muted" />
              <h2 className="text-h2 font-semibold text-fg">
                No {period}ly insight yet
              </h2>
            </div>
            <p className="mt-1.5 text-fg-secondary">
              Generate one with the AI pipeline — it computes a structured
              summary from your data first, so every sentence is grounded in
              a real number.
            </p>
            <pre className="mt-4 rounded-[10px] border border-border bg-surface-2 p-3 text-meta text-fg-secondary">
              npm run insights
            </pre>
          </Panel>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              {SECTIONS.map((section) => (
                <Panel key={section.key}>
                  <div className="text-micro uppercase tracking-[0.14em] text-fg-muted">
                    {section.label}
                  </div>
                  <p className="mt-2 text-fg">{insight.content[section.key]}</p>
                  <div className="mt-2 text-micro text-fg-muted">
                    {section.description}
                  </div>
                </Panel>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-micro text-fg-muted">
              <span className="num">
                {insight.periodStart} – {insight.periodEnd}
              </span>
              <span>
                {insight.provider} · {insight.model}
              </span>
              <span>
                generated {new Date(insight.createdAt).toISOString().slice(0, 16).replace("T", " ")}
              </span>
            </div>
          </div>
        )
      )}
    </>
  );
}

function trendOfPct(delta: number) {
  if (delta > 3) return "improving" as const;
  if (delta < -3) return "declining" as const;
  return "stable" as const;
}
