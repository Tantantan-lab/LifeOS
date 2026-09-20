"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import type { ThemePreference } from "@/components/theme/theme-provider";
import { cn } from "@/lib/utils";

const OPTIONS: { value: ThemePreference; icon: typeof Sun; label: string }[] = [
  { value: "system", icon: Monitor, label: "System theme" },
  { value: "dark", icon: Moon, label: "Dark theme" },
  { value: "light", icon: Sun, label: "Light theme" },
];

/** Segmented System / Dark / Light switch — default Dark. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  return (
    <div
      role="group"
      aria-label="Theme"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-border bg-surface-2 p-0.5",
        className
      )}
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          suppressHydrationWarning
          aria-pressed={theme === option.value}
          aria-label={option.label}
          title={option.label}
          onClick={() => setTheme(option.value)}
          className={cn(
            "rounded-full p-1.5 transition-colors",
            theme === option.value
              ? "bg-surface-1 text-fg"
              : "text-fg-muted hover:text-fg"
          )}
        >
          <option.icon className="size-3.5" />
        </button>
      ))}
    </div>
  );
}
