/**
 * Static class-name maps for domain/trend colors. MUST stay static string
 * literals — Tailwind v4 scans source as plain text and never sees
 * constructed names like `bg-domain-${domain}` (they produce zero CSS).
 * Domain colors = identity only; trend colors = change only.
 */

import type { Domain, Trend } from "@/data/types";

export const DOMAIN_BG_CLASS: Record<Domain, string> = {
  study: "bg-domain-study",
  english: "bg-domain-english",
  fitness: "bg-domain-fitness",
  coding: "bg-domain-coding",
  sleep: "bg-domain-sleep",
};

export const DOMAIN_TEXT_CLASS: Record<Domain, string> = {
  study: "text-domain-study",
  english: "text-domain-english",
  fitness: "text-domain-fitness",
  coding: "text-domain-coding",
  sleep: "text-domain-sleep",
};

export const TREND_TEXT_CLASS: Record<Trend, string> = {
  improving: "text-trend-up",
  stable: "text-trend-flat",
  declining: "text-trend-down",
};
