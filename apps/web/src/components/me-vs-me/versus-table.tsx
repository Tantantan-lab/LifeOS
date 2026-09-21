"use client";

import type { Domain, VersusRow } from "@/data/types";
import { DomainChip } from "@/components/primitives/domain-chip";
import { MetricDelta } from "@/components/primitives/metric-delta";
import { Sparkline } from "@/components/primitives/sparkline";
import { TREND_TEXT_CLASS } from "@/lib/domain-colors";
import { useLocale } from "@/components/i18n/locale-provider";
import { t, zhValue } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** THEN → NOW comparison rows; clicking a row drives the detail chart. */
export function VersusTable({
  rows,
  selected,
  onSelect,
}: {
  rows: VersusRow[];
  selected: Domain;
  onSelect: (domain: Domain) => void;
}) {
  const { locale } = useLocale();
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        <div className="grid grid-cols-[1.3fr_0.9fr_0.9fr_1.15fr_84px] gap-3 px-3 pb-2 text-micro uppercase tracking-[0.1em] text-fg-muted">
          <span>{t(locale, "Domain")}</span>
          <span>{t(locale, "Then")}</span>
          <span>{t(locale, "Now")}</span>
          <span>{t(locale, "Change")}</span>
          <span className="text-right">{t(locale, "Trend")}</span>
        </div>
        <div className="space-y-1">
          {rows.map((row) => (
            <button
              key={row.domain}
              type="button"
              onClick={() => onSelect(row.domain)}
              aria-pressed={selected === row.domain}
              className={cn(
                "grid w-full grid-cols-[1.3fr_0.9fr_0.9fr_1.15fr_84px] items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors",
                selected === row.domain
                  ? "bg-surface-2 ring-1 ring-border"
                  : "hover:bg-surface-2/60"
              )}
            >
              <DomainChip
                domain={row.domain}
                label={t(locale, row.label)}
              />
              <span className="num text-display font-medium text-fg-secondary">
                {locale === "zh" ? zhValue(row.thenLabel) : row.thenLabel}
                <span className="ml-1 text-micro text-fg-muted">{t(locale, row.unitLabel)}</span>
              </span>
              <span className="num text-display font-medium text-fg">
                {locale === "zh" ? zhValue(row.nowLabel) : row.nowLabel}
                <span className="ml-1 text-micro text-fg-muted">{t(locale, row.unitLabel)}</span>
              </span>
              <MetricDelta
                deltaPct={row.deltaPct}
                trend={row.trend}
                withWord
                className="text-sm"
              />
              <Sparkline
                values={row.spark}
                height={24}
                className={`h-6 ${TREND_TEXT_CLASS[row.trend]}`}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
