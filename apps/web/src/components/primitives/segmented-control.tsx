"use client";

import { cn } from "@/lib/utils";

/**
 * Segmented control — used for heatmap domain filters and Me vs Me
 * period tabs. Neutral track, no brand color (the brand accent stays
 * reserved for active nav / progress / primary actions).
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-0.5 rounded-full border border-border bg-surface-2 p-0.5"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-full px-3 py-1 text-sm transition-colors",
            value === option.value
              ? "bg-surface-1 text-fg"
              : "text-fg-secondary hover:text-fg"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
