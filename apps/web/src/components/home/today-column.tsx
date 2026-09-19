import type { TodayItem } from "@/data/types";
import { Panel } from "@/components/primitives/panel";
import { DomainDot } from "@/components/primitives/domain-chip";
import { SectionHeading } from "@/components/primitives/section-heading";
import { NO_ENTRIES_TODAY } from "@/lib/copy";

/** Compact timeline of everything logged today, newest first. */
export function TodayColumn({ items }: { items: TodayItem[] }) {
  return (
    <Panel className="flex h-full flex-col">
      <SectionHeading title="Today" />
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
