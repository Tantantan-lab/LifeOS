import { TREND_TEXT_CLASS } from "@/lib/domain-colors";
import { formatDelta } from "@/lib/format";
import { BELOW_BASELINE, TREND_LABELS } from "@/lib/copy";
import type { Trend } from "@/data/types";
import { cn } from "@/lib/utils";

/**
 * Trend-colored delta chip. Neutral wording only: ↑18% / ↓12% / — 0%,
 * with "Below baseline" as the declining footnote — never "bad"/"failed".
 */
export function MetricDelta({
  deltaPct,
  trend,
  withWord = false,
  className,
}: {
  deltaPct: number;
  trend: Trend;
  withWord?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "num inline-flex items-center gap-1.5 text-sm",
        TREND_TEXT_CLASS[trend],
        className
      )}
    >
      {formatDelta(deltaPct)}
      {withWord && (
        <>
          <span className="text-fg-muted">·</span>
          <span className="text-fg-secondary">{TREND_LABELS[trend]}</span>
        </>
      )}
      {trend === "declining" && (
        <span className="text-micro text-fg-muted">{BELOW_BASELINE}</span>
      )}
    </span>
  );
}
