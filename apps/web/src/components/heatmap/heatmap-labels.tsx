import type { MonthLabel } from "@/components/heatmap/heatmap-geometry";

/**
 * Month labels above the grid and Mon/Wed/Fri gutter to its left.
 * Labels are absolutely positioned at column pitch offsets so they share
 * the grid's exact horizontal rhythm.
 */
export function HeatmapMonthLabels({
  labels,
  pitch,
  gutterWidth,
}: {
  labels: MonthLabel[];
  pitch: number;
  gutterWidth: number;
}) {
  return (
    <div className="relative h-5" aria-hidden>
      {labels.map((label) => (
        <span
          key={`${label.label}-${label.col}`}
          className="absolute top-0 text-micro text-fg-muted"
          style={{ left: gutterWidth + label.col * pitch }}
        >
          {label.label}
        </span>
      ))}
    </div>
  );
}

export function HeatmapWeekdayLabels({
  cellSize,
  gap,
  width,
}: {
  cellSize: number;
  gap: number;
  width: number;
}) {
  const rows = ["", "Mon", "", "Wed", "", "Fri", ""];
  return (
    <div
      aria-hidden
      className="grid shrink-0 grid-rows-7"
      style={{ width, gap, gridAutoFlow: "row" }}
    >
      {rows.map((label, i) => (
        <span
          key={i}
          className="flex items-center justify-end text-micro text-fg-muted"
          style={{ height: cellSize }}
        >
          {label}
        </span>
      ))}
    </div>
  );
}
