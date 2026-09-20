import type { HeaderStatus } from "@/data/types";

/**
 * Data-driven header: time-of-day greeting + a status line COMPUTED from
 * 90-day deltas (never canned motivation). Right side: today's date.
 */
export function DashboardHeader({ status }: { status: HeaderStatus }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-h1 font-semibold tracking-tight text-fg">
          {status.greeting}
        </h1>
        <p className="mt-1 text-fg-secondary">{status.line}</p>
      </div>
      <div className="num text-meta text-fg-muted">{status.dateLabel}</div>
    </div>
  );
}
