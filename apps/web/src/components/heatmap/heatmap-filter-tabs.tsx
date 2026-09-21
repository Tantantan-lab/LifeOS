"use client";

import { HEATMAP_DOMAINS, HEATMAP_META } from "@/data/constants";
import type { HeatmapDomain } from "@/data/types";
import { SegmentedControl } from "@/components/primitives/segmented-control";

export type HeatmapFilter = "all" | HeatmapDomain;

export const HEATMAP_FILTER_OPTIONS: { value: HeatmapFilter; label: string }[] = [
  { value: "all", label: "All" },
  ...HEATMAP_DOMAINS.map((d) => ({
    value: d as HeatmapFilter,
    // facet labels live in HEATMAP_META (learning facet reads "Reading")
    label: HEATMAP_META[d].label,
  })),
];

export function HeatmapFilterTabs({
  value,
  onChange,
}: {
  value: HeatmapFilter;
  onChange: (value: HeatmapFilter) => void;
}) {
  return (
    <SegmentedControl
      value={value}
      onChange={onChange}
      options={HEATMAP_FILTER_OPTIONS}
      ariaLabel="Contribution domain"
    />
  );
}
