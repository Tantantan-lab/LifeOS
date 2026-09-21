"use client";

import { HEATMAP_DOMAINS, HEATMAP_META } from "@/data/constants";
import type { HeatmapDomain } from "@/data/types";
import { SegmentedControl } from "@/components/primitives/segmented-control";
import { useLocale } from "@/components/i18n/locale-provider";
import { t } from "@/lib/i18n";

export type HeatmapFilter = "all" | HeatmapDomain;

export function HeatmapFilterTabs({
  value,
  onChange,
}: {
  value: HeatmapFilter;
  onChange: (value: HeatmapFilter) => void;
}) {
  const { locale } = useLocale();
  const options: { value: HeatmapFilter; label: string }[] = [
    { value: "all", label: t(locale, "All") },
    // facet labels live in HEATMAP_META (learning facet reads "Reading")
    ...HEATMAP_DOMAINS.map((d) => ({
      value: d as HeatmapFilter,
      label: t(locale, HEATMAP_META[d].label),
    })),
  ];
  return (
    <SegmentedControl
      value={value}
      onChange={onChange}
      options={options}
      ariaLabel="Contribution domain"
    />
  );
}
