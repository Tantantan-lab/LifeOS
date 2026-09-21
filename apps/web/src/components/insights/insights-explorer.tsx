"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import type { GapItem, InsightRecord, InsightTrendRow } from "@/data/types";
import { Panel } from "@/components/primitives/panel";
import { DomainDot } from "@/components/primitives/domain-chip";
import { MetricDelta } from "@/components/primitives/metric-delta";
import { GapList } from "@/components/goals/gap-list";
import { SegmentedControl } from "@/components/primitives/segmented-control";
import { useLocale } from "@/components/i18n/locale-provider";
import { t } from "@/lib/i18n";

type TabKey = "summary" | "trends" | "gaps" | "analysis";

const TABS: { value: TabKey; label: string }[] = [
  { value: "summary", label: "Summary" },
  { value: "trends", label: "Trends" },
  { value: "gaps", label: "Gaps" },
  { value: "analysis", label: "AI Analysis" },
];

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

/**
 * The Insights experience, shared verbatim by Home and /insights.
 * Tab state is client-side so the component works standalone anywhere.
 */
export function InsightsExplorer({
  insight,
  trends,
  gaps,
  period,
  initialTab = "summary",
}: {
  insight: InsightRecord | null;
  trends: InsightTrendRow[];
  gaps: GapItem[];
  period: "week" | "month";
  initialTab?: TabKey;
}) {
  const [tab, setTab] = useState<TabKey>(initialTab);
  const { locale } = useLocale();
  const zh = locale === "zh";

  return (
    <div className="space-y-5">
      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={TABS.map((x) => ({ value: x.value, label: t(locale, x.label) }))}
        ariaLabel="Insights section"
      />

      {tab === "summary" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {trends.map((row) => (
            <Panel key={row.metric} tight>
              <div className="flex items-center gap-2">
                <DomainDot domain={row.domain} />
                <span className="text-sm text-fg-secondary">{t(locale, row.label)}</span>
                <span className="ml-auto text-micro text-fg-muted">
                  {t(locale, DATA_STATE_LABEL[row.dataState])}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-3">
                <MetricDelta deltaPct={row.delta30} trend={trendOfPct(row.delta30)} className="text-sm" />
                <span className="text-micro text-fg-muted">{t(locale, "30 days")}</span>
                <MetricDelta deltaPct={row.delta90} trend={row.trend90} className="text-sm" />
                <span className="text-micro text-fg-muted">{t(locale, "90 days")}</span>
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
                  <th className="pb-2 font-normal">{t(locale, "Domain")}</th>
                  <th className="pb-2 font-normal">{t(locale, "30 days")}</th>
                  <th className="pb-2 font-normal">{t(locale, "90 days")}</th>
                  <th className="pb-2 font-normal">{t(locale, "Data")}</th>
                </tr>
              </thead>
              <tbody>
                {trends.map((row) => (
                  <tr key={row.metric} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5">
                      <span className="inline-flex items-center gap-2">
                        <DomainDot domain={row.domain} />
                        <span className="text-fg-secondary">{t(locale, row.label)}</span>
                      </span>
                    </td>
                    <td className="num py-2.5">
                      <MetricDelta deltaPct={row.delta30} trend={trendOfPct(row.delta30)} />
                    </td>
                    <td className="num py-2.5">
                      <MetricDelta deltaPct={row.delta90} trend={row.trend90} />
                    </td>
                    <td className="py-2.5 text-micro text-fg-muted">
                      {t(locale, DATA_STATE_LABEL[row.dataState])}
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
                {zh
                  ? `暂无${period === "week" ? "周" : "月"}洞察`
                  : `No ${period}ly insight yet`}
              </h2>
            </div>
            <p className="mt-1.5 text-fg-secondary">
              {zh
                ? "用 AI 管线生成一条——它会先基于你的数据计算结构化摘要，因此每句话都有真实数字支撑。"
                : "Generate one with the AI pipeline — it computes a structured summary from your data first, so every sentence is grounded in a real number."}
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
                    {zh
                      ? ({ fact: "事实", trend: "趋势", gap: "差距", action: "行动" }[section.key])
                      : section.label}
                  </div>
                  <p className="mt-2 text-fg">{insight.content[section.key]}</p>
                  <div className="mt-2 text-micro text-fg-muted">
                    {t(locale, section.description)}
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
                {t(locale, "generated")} {new Date(insight.createdAt).toISOString().slice(0, 16).replace("T", " ")}
              </span>
            </div>
          </div>
        )
      )}
    </div>
  );
}

function trendOfPct(delta: number) {
  if (delta > 3) return "improving" as const;
  if (delta < -3) return "declining" as const;
  return "stable" as const;
}
