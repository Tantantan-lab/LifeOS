import type { TodayItem } from "@/data/types";
import { Panel } from "@/components/primitives/panel";
import { DomainDot } from "@/components/primitives/domain-chip";
import { SectionHeading } from "@/components/primitives/section-heading";
import { NO_ENTRIES_TODAY } from "@/lib/copy";

/** Compact timeline of everything logged today, newest first. */
export function TodayColumn({
  items,
  completion,
}: {
  items: TodayItem[];
  /** Today's overall goal completion 0..1 (null = no data at all). */
  completion: number | null;
}) {
  return (
    <Panel className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <SectionHeading title="Today" />
        {completion !== null && <DailyGoalRing completion={completion} />}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-8 text-fg-secondary">
          {NO_ENTRIES_TODAY}
        </div>
      ) : (
        <ol className="flex flex-1 flex-col gap-3 overflow-y-auto">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-2.5">
              <span className="num w-10 shrink-0 text-micro text-fg-muted">
                {item.time}
              </span>
              <DomainDot domain={item.domain} className="size-1.5" />
              <span className="min-w-0 flex-1 truncate text-sm text-fg-secondary">
                {item.metricLabel}
              </span>
              <span
                className="num shrink-0 text-sm text-fg"
                title={`${item.sourceLabel} · ${item.confidence} confidence`}
              >
                {item.valueLabel}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

/** Ring progress — TODAY's goal completion, never a "life score". */
function DailyGoalRing({ completion }: { completion: number }) {
  const r = 17;
  const c = 2 * Math.PI * r;
  const pct = Math.round(completion * 100);
  return (
    <div className="relative size-12 shrink-0" title="Daily Goal completion">
      <svg viewBox="0 0 40 40" className="size-12 -rotate-90">
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke="var(--color-surface-2)"
          strokeWidth="4"
        />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * c} ${c}`}
        />
      </svg>
      <span className="num absolute inset-0 flex items-center justify-center text-micro text-fg">
        {pct}%
      </span>
    </div>
  );
}

