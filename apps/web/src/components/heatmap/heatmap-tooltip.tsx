"use client";

import type { HeatmapDay } from "@/data/types";
import type { HeatmapFilter } from "@/components/heatmap/heatmap-filter-tabs";
import { HEATMAP_META } from "@/data/constants";
import { useLocale } from "@/components/i18n/locale-provider";
import { t } from "@/lib/i18n";
import { formatDateLong } from "@/lib/dates";
import { formatDateLongZh } from "@/lib/format";
import { noLogged, SOURCE_LABELS } from "@/lib/copy";
import { cn } from "@/lib/utils";

const LABEL: Record<HeatmapFilter, string> = {
  all: "Overall",
  learning: "Reading",
  english: "English",
  coding: "Coding",
  productivity: "Productivity",
  fitness: "Fitness",
};

const UNIT: Record<HeatmapFilter, string> = {
  all: "",
  learning: "min",
  english: "words",
  coding: "commits",
  productivity: "tasks",
  fitness: "sessions",
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
  const { locale } = useLocale();
  const zh = locale === "zh";
  let valueLine: string;
  let goalLine: string;
  let sourceLine: string;

  if (domain === "all") {
    const pct = Math.round(day.completionAll * 100);
    valueLine = `${pct}%`;
    goalLine = t(locale, "4-domain average");
    sourceLine = t(locale, "reading · english · coding · productivity");
  } else {
    const meta = HEATMAP_META[domain];
    const cell = day[domain];
    const pct = Math.round(cell.completion * 100);
    const label = t(locale, LABEL[domain]);
    const goalLabel = t(locale, meta.goalLabel);
    if (cell.value === 0) {
      valueLine = zh ? `无${label}记录` : noLogged(label);
      goalLine = zh ? `目标：${goalLabel}` : `Goal: ${meta.goalLabel}`;
    } else {
      valueLine = `${cell.displayValue} ${t(locale, UNIT[domain])}`;
      goalLine = zh ? `${goalLabel}的 ${pct}%` : `${pct}% of ${meta.goalLabel}`;
    }
    const source = { learning: "timer", english: "anki", coding: "demo", productivity: "demo", fitness: "xunji" }[domain] as "timer";
    sourceLine = `${SOURCE_LABELS[source]}${t(locale, " · 0.95 confidence")}`;
  }

  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 w-48 -translate-x-1/2 -translate-y-full rounded-[10px] border border-border bg-surface-2 p-3"
      style={{ left, top }}
    >
      <div className="text-micro text-fg-secondary">
        {zh ? formatDateLongZh(day.date) : formatDateLong(day.date)}
      </div>
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
