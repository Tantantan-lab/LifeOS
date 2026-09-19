import { cn } from "@/lib/utils";

/** Brand-indigo progress fill on a Surface 2 track — the only progress style. */
export function ProgressBar({
  value,
  className,
  trackClassName,
}: {
  value: number; // 0..1
  className?: string;
  trackClassName?: string;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-surface-2",
        className,
        trackClassName
      )}
    >
      <div
        className="h-full rounded-full bg-brand transition-[width]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
