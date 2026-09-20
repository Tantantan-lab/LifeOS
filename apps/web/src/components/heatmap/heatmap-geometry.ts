/**
 * Pure heatmap geometry — no React, unit-testable.
 * Grid layout: grid-flow-col + grid-rows-7, so emitting days in
 * chronological order fills week-columns × weekday-rows for free.
 */

import { daysBetween, monthKeyOf, monthShortOf } from "@/lib/dates";

export interface MonthLabel {
  label: string;
  col: number;
}

export interface GridGeometry {
  leadingBlanks: number;
  weeks: number;
  monthLabels: MonthLabel[];
}

/** Column of a given day index (0-based within the emitted list). */
export function colOf(index: number, leadingBlanks: number): number {
  return Math.floor((leadingBlanks + index) / 7);
}

export function buildGrid(
  gridStart: string,
  dates: string[]
): GridGeometry {
  const leadingBlanks = dates.length
    ? Math.max(0, daysBetween(gridStart, dates[0]))
    : 0;
  const weeks = Math.ceil((leadingBlanks + dates.length) / 7);

  // One label per month at the first day of that month, dropped when it
  // would sit within 2 columns of the previous label (overlap guard) or
  // when the month has fewer than 15 days of data (partial edge months
  // like a trailing September would otherwise duplicate the next year's
  // label and read as a bug).
  const daysInMonth = new Map<string, number>();
  for (const date of dates) {
    const month = monthKeyOf(date);
    daysInMonth.set(month, (daysInMonth.get(month) ?? 0) + 1);
  }
  const monthLabels: MonthLabel[] = [];
  let lastCol = -99;
  let prevMonth = "";
  dates.forEach((date, i) => {
    const month = monthKeyOf(date);
    if (month !== prevMonth) {
      prevMonth = month;
      const col = colOf(i, leadingBlanks);
      if (col - lastCol >= 2 && (daysInMonth.get(month) ?? 0) >= 15) {
        monthLabels.push({ label: monthShortOf(date), col });
        lastCol = col;
      }
    }
  });

  return { leadingBlanks, weeks, monthLabels };
}
