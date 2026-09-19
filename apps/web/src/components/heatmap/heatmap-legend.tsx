import { HEATMAP_CAPTION, HEATMAP_LESS, HEATMAP_MORE } from "@/lib/copy";
import type { HeatmapFilter } from "@/components/heatmap/heatmap-filter-tabs";

/**
 * The encoding definition itself — the caption must always travel with
 * the heatmap so "completion rate, capped at 100%" is never implicit.
 * Squares reuse the hm-cell ramp by carrying data-domain + data-level.
 */
export function HeatmapLegend({ domain }: { domain: HeatmapFilter }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="text-micro text-fg-muted">{HEATMAP_LESS}</span>
      <div
        className="hm-grid inline-flex items-center gap-[3px]"
        data-domain={domain}
        aria-hidden
      >
        {[0, 1, 2, 3, 4].map((level) => (
          <span
            key={level}
            className="hm-cell size-3 rounded-[3px]"
            data-level={level}
          />
        ))}
      </div>
      <span className="text-micro text-fg-muted">{HEATMAP_MORE}</span>
      <span className="text-micro text-fg-muted">{HEATMAP_CAPTION}</span>
    </div>
  );
}
