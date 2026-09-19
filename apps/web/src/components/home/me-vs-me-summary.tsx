import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { MeVsMeWindow } from "@/data/types";
import { Panel } from "@/components/primitives/panel";
import { DomainChip } from "@/components/primitives/domain-chip";
import { MetricDelta } from "@/components/primitives/metric-delta";
import { SectionHeading } from "@/components/primitives/section-heading";

/** Top 3 movers of the last 30 days: THEN → NOW. */
export function MeVsMeSummary({ window }: { window: MeVsMeWindow }) {
  const top3 = [...window.rows]
    .sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct))
    .slice(0, 3);

  return (
    <Panel className="flex h-full flex-col">
      <SectionHeading
        title="Me vs Me"
        action={
          <Link
            href="/me-vs-me"
            className="inline-flex items-center gap-1 text-sm text-fg-secondary transition-colors hover:text-fg"
          >
            View all <ArrowRight className="size-3.5" />
          </Link>
        }
      />
      <div className="flex flex-1 flex-col justify-center gap-4">
        {top3.map((row) => (
          <div key={row.domain} className="flex items-center gap-3">
            <DomainChip
              domain={row.domain}
              label={row.label}
              className="w-24 shrink-0"
            />
            <span className="num min-w-0 flex-1 truncate text-sm text-fg">
              <span className="text-fg-muted">{row.thenLabel}</span>
              <span className="mx-1.5 text-fg-muted">→</span>
              {row.nowLabel}
              <span className="ml-1 text-micro text-fg-muted">
                {row.unitLabel}
              </span>
            </span>
            <MetricDelta
              deltaPct={row.deltaPct}
              trend={row.trend}
              className="shrink-0 text-xs"
            />
          </div>
        ))}
      </div>
      <div className="mt-3 text-micro text-fg-muted">{window.nowRange}</div>
    </Panel>
  );
}
