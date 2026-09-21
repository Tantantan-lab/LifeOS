"use client";

import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { HeatmapDay } from "@/data/types";
import type { HeatmapFilter } from "@/components/heatmap/heatmap-filter-tabs";
import { useLocale } from "@/components/i18n/locale-provider";
import { t } from "@/lib/i18n";
import { formatDateLong } from "@/lib/dates";
import { formatDateLongZh } from "@/lib/format";
import { noLogged } from "@/lib/copy";
import { cn } from "@/lib/utils";

const FILTER_LABEL: Record<HeatmapFilter, string> = {
  all: "Overall",
  learning: "Reading",
  english: "English",
  coding: "Coding",
  productivity: "Productivity",
  fitness: "Fitness",
};

const FILTER_UNIT: Record<HeatmapFilter, string> = {
  all: "",
  learning: "min",
  english: "words",
  coding: "commits",
  productivity: "tasks",
  fitness: "sessions",
};

function cellAriaLabel(day: HeatmapDay, domain: HeatmapFilter, locale: "en" | "zh"): string {
  const date = locale === "zh" ? formatDateLongZh(day.date) : formatDateLong(day.date);
  const label = t(locale, FILTER_LABEL[domain]);
  if (domain === "all") {
    const pct = Math.round(day.completionAll * 100);
    return locale === "zh"
      ? `${date}。全部 ${pct}% 的四域每日目标完成率。`
      : `${date}. Overall ${pct} percent of daily goals across four domains.`;
  }
  const cell = day[domain];
  if (cell.value === 0) {
    return locale === "zh"
      ? `${date}。${label}：无记录。`
      : `${date}. ${label}. ${noLogged(label)}.`;
  }
  return locale === "zh"
    ? `${date}。${label} ${cell.displayValue} ${t(locale, FILTER_UNIT[domain])}，目标完成 ${Math.round(cell.completion * 100)}%。`
    : `${date}. ${label} ${cell.displayValue} ${FILTER_UNIT[domain]}, ${Math.round(cell.completion * 100)} percent of goal.`;
}

/**
 * The 53×7 grid. Cells carry no color classes — the ramp is entirely
 * static CSS driven by data-domain + data-level (see styles/base.css).
 * Keyboard: arrows move ±1 day / ±7 days, Home/End move within the week,
 * with a roving tabIndex so the grid is one tab stop.
 */
export function HeatmapGrid({
  days,
  leadingBlanks,
  domain,
  cellCls,
  gapCls,
  onActive,
  onSelect,
  selectedDate,
}: {
  days: HeatmapDay[];
  leadingBlanks: number;
  domain: HeatmapFilter;
  cellCls: string;
  gapCls: string;
  onActive: (day: HeatmapDay, left: number, top: number) => void;
  onSelect: (day: HeatmapDay) => void;
  selectedDate: string | null;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [focusIdx, setFocusIdx] = useState(days.length - 1);
  const { locale } = useLocale();

  const levelOf = (day: HeatmapDay) =>
    domain === "all" ? day.levelAll : day[domain].level;

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    const idx = days.findIndex((d) => d.date === target.dataset.date);
    if (idx < 0) return;

    let next = -1;
    switch (e.key) {
      case "ArrowRight":
        next = idx + 1;
        break;
      case "ArrowLeft":
        next = idx - 1;
        break;
      case "ArrowDown":
        next = idx + 7;
        break;
      case "ArrowUp":
        next = idx - 7;
        break;
      case "Home":
        next = idx - (idx % 7);
        break;
      case "End":
        next = idx + (6 - (idx % 7));
        break;
      default:
        return;
    }
    if (next < 0 || next >= days.length) return;
    e.preventDefault();
    setFocusIdx(next);
    const cell = gridRef.current?.querySelector<HTMLElement>(
      `[data-date="${days[next].date}"]`
    );
    cell?.focus();
  }

  return (
    <div
      ref={gridRef}
      role="grid"
      aria-label="Contribution heatmap"
      data-domain={domain}
      onKeyDown={handleKeyDown}
      className={cn("hm-grid grid w-fit grid-flow-col grid-rows-7", gapCls)}
    >
      {Array.from({ length: leadingBlanks }).map((_, i) => (
        <span key={`pad-${i}`} className={cellCls} aria-hidden />
      ))}
      {days.map((day, i) => (
        <button
          key={day.date}
          type="button"
          data-date={day.date}
          data-level={levelOf(day)}
          role="gridcell"
          aria-selected={selectedDate === day.date}
          tabIndex={i === focusIdx ? 0 : -1}
          aria-label={cellAriaLabel(day, domain, locale)}
          className={cn("hm-cell", cellCls)}
          onMouseEnter={(e) => {
            onActive(day, e.currentTarget.offsetLeft, e.currentTarget.offsetTop);
            setFocusIdx(i);
          }}
          onFocus={() => setFocusIdx(i)}
          onClick={() => onSelect(day)}
        />
      ))}
    </div>
  );
}
