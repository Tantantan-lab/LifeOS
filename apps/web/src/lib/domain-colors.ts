/**
 * Static class-name maps for domain/trend colors. MUST stay static string
 * literals — Tailwind v4 scans source as plain text and never sees
 * constructed names like `bg-domain-${domain}` (they produce zero CSS).
 * Domain colors = identity only; trend colors = change only.
 */

import type { Domain, Trend } from "@/data/types";

export const DOMAIN_BG_CLASS: Record<Domain | "fitness", string> = {
  learning: "bg-domain-learning",
  english: "bg-domain-english",
  coding: "bg-domain-coding",
  health: "bg-domain-health",
  productivity: "bg-domain-productivity",
  fitness: "bg-domain-fitness",
};

export const DOMAIN_TEXT_CLASS: Record<Domain | "fitness", string> = {
  learning: "text-domain-learning",
  english: "text-domain-english",
  coding: "text-domain-coding",
  health: "text-domain-health",
  productivity: "text-domain-productivity",
  fitness: "text-domain-fitness",
};

export const TREND_TEXT_CLASS: Record<Trend, string> = {
  improving: "text-trend-up",
  stable: "text-trend-flat",
  declining: "text-trend-down",
};
