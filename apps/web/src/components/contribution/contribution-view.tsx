"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Panel } from "@/components/primitives/panel";
import { ContributionHeatmap } from "@/components/heatmap/contribution-heatmap";
import { DomainDot } from "@/components/primitives/domain-chip";
import { ProgressBar } from "@/components/primitives/progress-bar";
import { HEATMAP_META } from "@/data/constants";
import { useLocale } from "@/components/i18n/locale-provider";
import { t } from "@/lib/i18n";
import type { HeatmapDay, HeatmapStats } from "@/data/types";
import { formatPct } from "@/lib/format";
import { HEATMAP_CAPTION } from "@/lib/copy";

export function ContributionView({
  gridStart,
  days,
  stats,
}: {
  gridStart: string;
  days: HeatmapDay[];
  stats: HeatmapStats;
}) {
  const { locale } = useLocale();
  const zh = locale === "zh";
  const caption = t(locale, HEATMAP_CAPTION);
  const statCards = [
    { label: t(locale, "Active days"), value: String(stats.activeDays90d), unit: t(locale, "of last 90 days") },
    { label: t(locale, "Current streak"), value: String(stats.currentStreak), unit: t(locale, "days") },
    { label: t(locale, "Longest streak"), value: String(stats.longestStreak), unit: t(locale, "days") },
    { label: t(locale, "Avg completion"), value: formatPct(stats.avgCompletion90d), unit: t(locale, "last 90 days") },
  ];

  return (
    <>
      <PageHeader
        title="Contribution"
        description={`${caption}${t(locale, " — completion against your goals, not raw volume.")}`}
      />

      <Panel className="overflow-x-auto">
        <ContributionHeatmap gridStart={gridStart} days={days} />
      </Panel>

      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Panel key={stat.label} tight>
            <div className="text-micro uppercase tracking-[0.1em] text-fg-muted">
              {stat.label}
            </div>
            <div className="num mt-1.5 text-display font-medium text-fg">
              {stat.value}
              <span className="ml-1.5 text-meta font-normal text-fg-muted">
                {stat.unit}
              </span>
            </div>
          </Panel>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <h2 className="text-h2 font-semibold text-fg">{t(locale, "By domain")}</h2>
          <div className="mt-4 space-y-4">
            {stats.perDomain.map((entry) => (
              <div key={entry.domain} className="flex items-center gap-3">
                <DomainDot domain={entry.domain} />
                <span className="w-24 shrink-0 text-sm text-fg-secondary">
                  {t(locale, HEATMAP_META[entry.domain].label)}
                </span>
                <ProgressBar value={entry.avgCompletion} className="h-1" />
                <span className="num w-28 shrink-0 text-right text-meta text-fg-muted">
                  {zh
                    ? `${entry.activeDays} 天 · ${formatPct(entry.avgCompletion)}`
                    : `${entry.activeDays} days · ${formatPct(entry.avgCompletion)}`}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <h2 className="text-h2 font-semibold text-fg">
            {t(locale, "How intensity works")}
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm text-fg-secondary">
            <li>{t(locale, "Intensity is completion against your daily goal — not raw volume.")}</li>
            <li>{t(locale, "Capped at 100%: studying 16h is never darker than 8h.")}</li>
            <li>{t(locale, "Coding, productivity and fitness compare the day's value to their weekly goals.")}</li>
            <li>{t(locale, "Health is excluded: sleep targets a band, not a floor.")}</li>
          </ul>
        </Panel>
      </div>
    </>
  );
}
