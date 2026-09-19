import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Panel } from "@/components/primitives/panel";
import { getInsight } from "@/data/selectors";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Insights" };

const SECTIONS: { key: "fact" | "trend" | "gap" | "action"; label: string; description: string }[] = [
  { key: "fact", label: "FACT", description: "What the data says." },
  { key: "trend", label: "TREND", description: "Direction over 30/90 days." },
  { key: "gap", label: "GAP", description: "Distance to your own goals." },
  { key: "action", label: "ACTION", description: "One concrete next step." },
];

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams; // Next 16: Promise
  const period = periodParam === "month" ? "month" : "week";
  const insight = await getInsight(period);

  return (
    <>
      <PageHeader
        title="Insights"
        description="AI-generated, evidence-backed observations — never judgments."
      >
        <Link
          href={`/insights?period=${period === "week" ? "month" : "week"}`}
          className={cn(
            "rounded-full border border-border px-3 py-1 text-sm transition-colors",
            "text-fg-secondary hover:text-fg"
          )}
        >
          {period === "week" ? "Monthly" : "Weekly"}
        </Link>
      </PageHeader>

      {insight === null ? (
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
            <span>generated {new Date(insight.createdAt).toISOString().slice(0, 16).replace("T", " ")}</span>
          </div>
        </div>
      )}
    </>
  );
}
