/**
 * Tone-sensitive user-facing strings, kept in one file so the "No judgment.
 * Just evidence." rule is grep-able and testable rather than reviewer memory.
 * Allowed words: Improving / Stable / Declining / Below baseline.
 * Forbidden words: bad, fail(ure), poor, worst, missed — enforced by grep.
 */

import type { Source, Trend } from "@/data/types";

export const TREND_LABELS: Record<Trend, string> = {
  improving: "Improving",
  stable: "Stable",
  declining: "Declining",
};

export const DELTA_FLAT = "— 0%";

export const ABOVE_BASELINE = "Above baseline";
export const BELOW_BASELINE = "Below baseline";

/** Empty heatmap day / empty today row — never "missed". */
export function noLogged(label: string): string {
  return `No ${label.toLowerCase()} logged`;
}

export const NO_ENTRIES_TODAY = "No entries yet";

export const SOURCE_LABELS: Record<Source, string> = {
  demo: "Demo",
  manual: "Manual",
  timer: "Timer",
  github: "GitHub",
  weread: "WeRead",
  maimemo: "Maimemo",
  ticktick: "TickTick",
  anki: "Anki",
  apple_health: "Apple Health",
  hevy: "Hevy",
};

/** Heatmap legend caption — the encoding definition itself. */
export const HEATMAP_CAPTION =
  "Intensity = % of that day's goal · capped at 100%";

export const HEATMAP_LESS = "Less";
export const HEATMAP_MORE = "More";

export const GOAL_PROGRESS_EYEBROW = "OVERSEAS ENGINEER";
export const GOAL_PROGRESS_READY = "ready";
export const GOAL_PROGRESS_NEVER_SCORE =
  "Progress against your target — not a score of your life.";

export const SAMPLE_BADGE = "Sample";
