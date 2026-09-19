"use client";

import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { HeatmapDay } from "@/data/types";
import type { HeatmapFilter } from "@/components/heatmap/heatmap-filter-tabs";
import { formatDateLong } from "@/lib/dates";
import { noLogged } from "@/lib/copy";
import { cn } from "@/lib/utils";

const FILTER_LABEL: Record<HeatmapFilter, string> = {
  all: "Overall",
  learning: "Learning",
  english: "English",
  coding: "Coding",
  productivity: "Productivity",
};

const FILTER_UNIT: Record<HeatmapFilter, string> = {
  all: "",
  learning: "min",
  english: "words",
  coding: "commits",
  productivity: "tasks",
};

export function cellAriaLabel(day: HeatmapDay, domain: HeatmapFilter): string {
  const date = formatDateLong(day.date);
  const label = FILTER_LABEL[domain];
  if (domain === "all") {
    return `${date}. Overall ${Math.round(day.completionAll * 100)} percent of daily goals across four domains.`;
  }
  const cell = day[domain];
  if (cell.value === 0) {
    return `${date}. ${label}. ${noLogged(label)}.`;
  }
  return `${date}. ${label} ${cell.displayValue} ${FILTER_UNIT[domain]}, ${Math.round(cell.completion * 100)} percent of goal.`;
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
}: {
  days: HeatmapDay[];
  leadingBlanks: number;
  domain: HeatmapFilter;
  cellCls: string;
  gapCls: string;
  onActive: (day: HeatmapDay, left: number, top: number) => void;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [focusIdx, setFocusIdx] = useState(days.length - 1);

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
          tabIndex={i === focusIdx ? 0 : -1}
          aria-label={cellAriaLabel(day, domain)}
          className={cn("hm-cell", cellCls)}
          onMouseEnter={(e) => {
            onActive(day, e.currentTarget.offsetLeft, e.currentTarget.offsetTop);
            setFocusIdx(i);
          }}
          onFocus={() => setFocusIdx(i)}
        />
      ))}
    </div>
  );
}
