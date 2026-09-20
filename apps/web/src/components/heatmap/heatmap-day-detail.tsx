import { X } from "lucide-react";
import type { HeatmapDay } from "@/data/types";
import { DOMAIN_META, HEATMAP_DOMAINS } from "@/data/constants";
import { DomainDot } from "@/components/primitives/domain-chip";
import { formatDateLong } from "@/lib/dates";
import { noLogged } from "@/lib/copy";
import { formatPct } from "@/lib/format";

/**
 * Click-a-day breakdown: what happened that day, per heatmap domain,
 * plus the overall Daily Goal percentage. Tone: empty domains read
 * "No X logged", never "missed".
 */
export function HeatmapDayDetail({
  day,
  onClose,
}: {
  day: HeatmapDay;
  onClose: () => void;
}) {
  return (
    <div
      className="mt-4 rounded-[10px] border border-border bg-surface-2/60 p-4"
      role="dialog"
      aria-label={`Day detail for ${formatDateLong(day.date)}`}
    >
      <div className="flex items-center gap-2">
        <span className="num text-sm font-medium text-fg">
          {formatDateLong(day.date)}
        </span>
        <span className="num ml-auto text-sm text-fg-secondary">
          Daily Goal: {formatPct(day.completionAll)}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close day detail"
          className="rounded-[6px] p-1 text-fg-muted transition-colors hover:bg-surface-1 hover:text-fg"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {HEATMAP_DOMAINS.map((domain) => {
          const cell = day[domain];
          const meta = DOMAIN_META[domain];
          const valueLabel =
            cell.value === 0
              ? noLogged(meta.label)
              : meta.goalMode === "trailing7"
                ? `${cell.displayValue} ${meta.metricLabel.toLowerCase()} this week`
                : `${cell.displayValue} ${meta.metricLabel.toLowerCase()}`;
          return (
            <div
              key={domain}
              className="flex items-center gap-2.5 rounded-[8px] border border-border bg-surface-1 px-3 py-2"
            >
              <DomainDot domain={domain} />
              <span className="min-w-0 flex-1 truncate text-sm text-fg-secondary">
                {meta.label}
              </span>
              <span className="num shrink-0 text-sm text-fg">{valueLabel}</span>
              <span className="num w-10 shrink-0 text-right text-micro text-fg-muted">
                {formatPct(cell.completion)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
