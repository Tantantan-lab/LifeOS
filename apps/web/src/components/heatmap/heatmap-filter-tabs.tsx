"use client";

import { HEATMAP_DOMAINS } from "@/data/constants";
import type { HeatmapDomain } from "@/data/types";
import { SegmentedControl } from "@/components/primitives/segmented-control";

export type HeatmapFilter = "all" | HeatmapDomain;

export const HEATMAP_FILTER_OPTIONS: { value: HeatmapFilter; label: string }[] = [
  { value: "all", label: "All" },
  ...HEATMAP_DOMAINS.map((d) => ({
    value: d as HeatmapFilter,
    label: d.charAt(0).toUpperCase() + d.slice(1),
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
