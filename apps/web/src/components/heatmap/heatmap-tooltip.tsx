import type { HeatmapDay } from "@/data/types";
import type { HeatmapFilter } from "@/components/heatmap/heatmap-filter-tabs";
import { DOMAIN_META } from "@/data/constants";
import { formatDateLong } from "@/lib/dates";
import { noLogged, SOURCE_LABELS } from "@/lib/copy";
import { cn } from "@/lib/utils";

const LABEL: Record<HeatmapFilter, string> = {
  all: "Overall",
  study: "Study",
  english: "English",
  fitness: "Fitness",
  coding: "Coding",
};

const UNIT: Record<HeatmapFilter, string> = {
  all: "",
  study: "min",
  english: "words",
  fitness: "sessions",
  coding: "commits",
};

/**
 * One floating panel for the whole grid (not one per cell). Tone rules:
 * an empty day reads "No X logged" — never "missed" / "failed".
 */
export function HeatmapTooltip({
  day,
  domain,
  left,
  top,
}: {
  day: HeatmapDay;
  domain: HeatmapFilter;
  left: number;
  top: number;
}) {
  let valueLine: string;
  let goalLine: string;
  let sourceLine: string;

  if (domain === "all") {
    const pct = Math.round(day.completionAll * 100);
    valueLine = `${pct}%`;
    goalLine = "4-domain average";
    sourceLine = "study · english · fitness · coding";
  } else {
    const meta = DOMAIN_META[domain];
    const cell = day[domain];
    const pct = Math.round(cell.completion * 100);
    if (cell.value === 0) {
      valueLine = noLogged(LABEL[domain]);
      goalLine = `Goal: ${meta.goalLabel}`;
    } else {
      valueLine = `${cell.displayValue} ${UNIT[domain]}${meta.goalMode === "trailing7" ? " this week" : ""}`;
      goalLine = `${pct}% of ${meta.goalLabel}`;
    }
    sourceLine = `${SOURCE_LABELS[meta.sources[0]]} · ${meta.confidences[0]} confidence`;
  }

  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 w-48 -translate-x-1/2 -translate-y-full rounded-[10px] border border-border bg-surface-2 p-3"
      style={{ left, top }}
    >
      <div className="text-micro text-fg-secondary">{formatDateLong(day.date)}</div>
      <div className={cn("num mt-1 text-display leading-tight", domain === "all" ? "text-fg" : "text-fg")}>
        {valueLine}
      </div>
      <div className="mt-0.5 text-micro text-fg-muted">{goalLine}</div>
      <div className="mt-1.5 border-t border-border pt-1.5 text-micro text-fg-muted">
        {sourceLine}
      </div>
    </div>
  );
}
