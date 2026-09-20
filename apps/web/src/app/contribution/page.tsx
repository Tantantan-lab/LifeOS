import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { Panel } from "@/components/primitives/panel";
import { ContributionHeatmap } from "@/components/heatmap/contribution-heatmap";
import { DomainDot } from "@/components/primitives/domain-chip";
import { ProgressBar } from "@/components/primitives/progress-bar";
import { getHeatmapData, getHeatmapStats } from "@/data/selectors";
import { HEATMAP_META } from "@/data/constants";
import { formatPct } from "@/lib/format";
import { HEATMAP_CAPTION } from "@/lib/copy";

export const metadata: Metadata = { title: "Contribution" };

export default async function ContributionPage() {
  const [heatmap, stats] = await Promise.all([getHeatmapData(), getHeatmapStats()]);

  const statCards = [
    { label: "Active days", value: String(stats.activeDays90d), unit: "of last 90 days" },
    { label: "Current streak", value: String(stats.currentStreak), unit: "days" },
    { label: "Longest streak", value: String(stats.longestStreak), unit: "days" },
    { label: "Avg completion", value: formatPct(stats.avgCompletion90d), unit: "last 90 days" },
  ];

  return (
    <>
      <PageHeader
        title="Contribution"
        description={`${HEATMAP_CAPTION} — completion against your goals, not raw volume.`}
      />

      <Panel className="overflow-x-auto">
        <ContributionHeatmap gridStart={heatmap.gridStart} days={heatmap.days} />
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
          <h2 className="text-h2 font-semibold text-fg">By domain</h2>
          <div className="mt-4 space-y-4">
            {stats.perDomain.map((entry) => (
              <div key={entry.domain} className="flex items-center gap-3">
                <DomainDot domain={entry.domain} />
                <span className="w-24 shrink-0 text-sm text-fg-secondary">
                  {HEATMAP_META[entry.domain].label}
                </span>
                <ProgressBar value={entry.avgCompletion} className="h-1" />
                <span className="num w-28 shrink-0 text-right text-meta text-fg-muted">
                  {entry.activeDays} days · {formatPct(entry.avgCompletion)}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <h2 className="text-h2 font-semibold text-fg">How intensity works</h2>
          <ul className="mt-4 space-y-2.5 text-sm text-fg-secondary">
            <li>Intensity is completion against your daily goal — not raw volume.</li>
            <li>Capped at 100%: studying 16h is never darker than 8h.</li>
            <li>Coding and productivity compare the trailing 7 days to their weekly goals.</li>
            <li>Health is excluded: sleep targets a band, not a floor.</li>
          </ul>
        </Panel>
      </div>
    </>
  );
}
