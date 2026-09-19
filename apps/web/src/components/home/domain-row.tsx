import type { DomainSummary } from "@/data/types";
import { DOMAIN_META } from "@/data/constants";
import { Panel } from "@/components/primitives/panel";
import { DomainDot } from "@/components/primitives/domain-chip";
import { MetricDelta } from "@/components/primitives/metric-delta";
import { ProgressBar } from "@/components/primitives/progress-bar";
import { Sparkline } from "@/components/primitives/sparkline";
import { TREND_TEXT_CLASS } from "@/lib/domain-colors";
import { NO_ENTRIES_TODAY } from "@/lib/copy";
import { formatPct } from "@/lib/format";

/**
 * "What have I been doing?" — one card per domain. Identity lives in the
 * dot (domain color); every change signal (delta + sparkline) is
 * trend-colored. Today's completion bar is brand indigo.
 */
export function DomainRow({ summaries }: { summaries: DomainSummary[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      {summaries.map((summary) => {
        const meta = DOMAIN_META[summary.domain];
        const todayPct =
          summary.todayCompletion === null ? 0 : summary.todayCompletion;
        return (
          <Panel key={summary.domain} tight>
            <div className="flex items-center gap-2">
              <DomainDot domain={summary.domain} />
              <span className="truncate text-sm text-fg-secondary">
                {meta.label}
              </span>
              <span className="ml-auto">
                <MetricDelta
                  deltaPct={summary.deltaPct}
                  trend={summary.trend}
                  className="text-xs"
                />
              </span>
            </div>

            <div className="mt-2 flex items-baseline gap-1">
              <span className="num text-display font-medium leading-none text-fg">
                {summary.headline}
              </span>
              <span className="text-meta text-fg-muted">{summary.unitLabel}</span>
            </div>

            <Sparkline
              values={summary.spark}
              className={`mt-3 h-7 ${TREND_TEXT_CLASS[summary.trend]}`}
              height={28}
            />

            <div className="mt-3">
              <ProgressBar value={todayPct} className="h-1" />
              <div className="mt-1.5 text-micro text-fg-muted">
                {summary.todayCompletion === null
                  ? "—"
                  : summary.todayValueLabel === null
                    ? `Today · ${NO_ENTRIES_TODAY}`
                    : `Today · ${summary.todayValueLabel} · ${formatPct(todayPct)}`}
              </div>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
