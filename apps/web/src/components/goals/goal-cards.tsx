"use client";

import type { GoalRow } from "@/data/types";
import { Panel } from "@/components/primitives/panel";
import { DomainDot } from "@/components/primitives/domain-chip";
import { MetricDelta } from "@/components/primitives/metric-delta";
import { ProgressBar } from "@/components/primitives/progress-bar";
import { useLocale } from "@/components/i18n/locale-provider";
import { t, zhValue } from "@/lib/i18n";
import { formatPct } from "@/lib/format";

/** One card per domain: target, current average, completion, consistency. */
export function GoalCards({ goals }: { goals: GoalRow[] }) {
  const { locale } = useLocale();
  const zh = locale === "zh";
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {goals.map((goal) => (
        <Panel key={goal.domain}>
          <div className="flex items-center gap-2">
            <DomainDot domain={goal.domain} />
            <span className="text-sm text-fg-secondary">
              {t(locale, goal.label)}
            </span>
            <span className="ml-auto">
              <MetricDelta
                deltaPct={goal.deltaPct}
                trend={goal.trend}
                className="text-xs"
              />
            </span>
          </div>

          <div className="mt-3 flex items-baseline gap-1">
            <span className="num text-display font-medium leading-none text-fg">
              {zh ? zhValue(goal.currentLabel) : goal.currentLabel}
            </span>
          </div>
          <div className="mt-1 text-micro text-fg-muted">
            {zh
              ? `目标：${t(locale, goal.targetLabel)}`
              : `Target: ${goal.targetLabel}`}
          </div>

          <div className="mt-3">
            <ProgressBar value={goal.completion} />
            <div className="mt-1.5 flex justify-between text-micro text-fg-muted">
              <span>{zh ? `${formatPct(goal.completion)} ${t(locale, "of target")}` : `${formatPct(goal.completion)} of target`}</span>
              <span className="num">
                7d {formatPct(goal.consistency7d)} · 30d {formatPct(goal.consistency30d)}
              </span>
            </div>
          </div>
        </Panel>
      ))}
    </div>
  );
}
