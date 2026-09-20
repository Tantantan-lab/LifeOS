"use client";

import { useMemo, useState } from "react";
import type { HeatmapDay } from "@/data/types";
import { buildGrid } from "@/components/heatmap/heatmap-geometry";
import { HeatmapFilterTabs } from "@/components/heatmap/heatmap-filter-tabs";
import type { HeatmapFilter } from "@/components/heatmap/heatmap-filter-tabs";
import { HeatmapGrid } from "@/components/heatmap/heatmap-grid";
import { HeatmapLegend } from "@/components/heatmap/heatmap-legend";
import { HeatmapMonthLabels, HeatmapWeekdayLabels } from "@/components/heatmap/heatmap-labels";
import { HeatmapTooltip } from "@/components/heatmap/heatmap-tooltip";
import { HeatmapDayDetail } from "@/components/heatmap/heatmap-day-detail";

const SIZE = {
  sm: { cell: 10, gap: 2, pitch: 12, cellCls: "size-2.5 rounded-[2px]", gapCls: "gap-[2px]" },
  md: { cell: 12, gap: 3, pitch: 15, cellCls: "size-3 rounded-[3px]", gapCls: "gap-[3px]" },
} as const;

const GUTTER_WIDTH = 28 + 8; // weekday gutter (w-7) + flex gap-2

export function ContributionHeatmap({
  gridStart,
  days,
  initialDomain = "all",
  size = "md",
  showTabs = true,
  showLegend = true,
  className,
}: {
  gridStart: string;
  days: HeatmapDay[];
  initialDomain?: HeatmapFilter;
  size?: keyof typeof SIZE;
  showTabs?: boolean;
  showLegend?: boolean;
  className?: string;
}) {
  const [domain, setDomain] = useState<HeatmapFilter>(initialDomain);
  const [active, setActive] = useState<{
    day: HeatmapDay;
    left: number;
    top: number;
  } | null>(null);
  const [selected, setSelected] = useState<HeatmapDay | null>(null);

  const s = SIZE[size];
  const geometry = useMemo(() => buildGrid(gridStart, days.map((d) => d.date)), [gridStart, days]);

  // Clamp the tooltip inside the grid width so edge cells don't overflow.
  const left = active
    ? Math.min(Math.max(active.left + s.cell / 2, 88), geometry.weeks * s.pitch - 88)
    : 0;

  return (
    <div className={className}>
      {showTabs && (
        <div className="mb-3">
          <HeatmapFilterTabs value={domain} onChange={setDomain} />
        </div>
      )}

      <HeatmapMonthLabels
        labels={geometry.monthLabels}
        pitch={s.pitch}
        gutterWidth={GUTTER_WIDTH}
      />

      <div className="flex gap-2">
        <HeatmapWeekdayLabels cellSize={s.cell} gap={s.gap} width={28} />
        <div
          className="relative"
          onMouseLeave={() => setActive(null)}
        >
          <HeatmapGrid
            days={days}
            leadingBlanks={geometry.leadingBlanks}
            domain={domain}
            cellCls={s.cellCls}
            gapCls={s.gapCls}
            selectedDate={selected?.date ?? null}
            onActive={(day, cellLeft, cellTop) =>
              setActive({ day, left: cellLeft, top: cellTop })
            }
            onSelect={setSelected}
          />
          {active && (
            <HeatmapTooltip
              day={active.day}
              domain={domain}
              left={left}
              top={active.top - 10}
            />
          )}
        </div>
      </div>

      {showLegend && (
        <div className="mt-3">
          <HeatmapLegend domain={domain} />
        </div>
      )}

      {selected && (
        <HeatmapDayDetail day={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
