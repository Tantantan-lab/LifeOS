import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { GoalRow } from "@/data/types";
import { DOMAIN_META } from "@/data/constants";
import { Panel } from "@/components/primitives/panel";
import { DomainDot } from "@/components/primitives/domain-chip";
import { ProgressBar } from "@/components/primitives/progress-bar";
import { SectionHeading } from "@/components/primitives/section-heading";
import { formatPct } from "@/lib/format";

/** Compact goal progress — current vs target per domain. */
export function GoalsSummary({ goals }: { goals: GoalRow[] }) {
  return (
    <Panel className="flex h-full flex-col">
      <SectionHeading
        title="Goals"
        action={
          <Link
            href="/goals"
            className="inline-flex items-center gap-1 text-sm text-fg-secondary transition-colors hover:text-fg"
          >
            View all <ArrowRight className="size-3.5" />
          </Link>
        }
      />
      <div className="flex flex-1 flex-col justify-center gap-3.5">
        {goals.slice(0, 4).map((goal) => (
          <div key={goal.domain}>
            <div className="flex items-center gap-2">
              <DomainDot domain={goal.domain} />
              <span className="truncate text-sm text-fg-secondary">
                {DOMAIN_META[goal.domain].label}
              </span>
              <span className="num ml-auto text-sm text-fg">
                {goal.currentLabel}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2.5">
              <ProgressBar value={goal.completion} className="h-1" />
              <span className="num shrink-0 text-micro text-fg-muted">
                {formatPct(goal.completion)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
