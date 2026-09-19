/** Display formatting — numbers-first, never judgmental. */

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** 75 → "1h 15m", 45 → "45m", 120 → "2h" */
export function formatDuration(minutes: number): string {
  const m = Math.round(minutes);
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest}m`;
  if (rest === 0) return `${h}h`;
  return `${h}h ${String(rest).padStart(2, "0")}m`;
}

/** 1123 → "18.7h" — used for Me vs Me coding totals. */
export function formatHours1(minutes: number): string {
  return `${(minutes / 60).toFixed(1)}h`;
}

/** 48 → "48", 3.25 → "3.3", 12 → "12" */
export function formatCount(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** "↑18%" / "↓12%" / "— 0%" (flat within the ±3% dead zone). */
export function formatDelta(pct: number, epsilon = 3): string {
  if (pct > epsilon) return `↑${Math.round(pct)}%`;
  if (pct < -epsilon) return `↓${Math.round(Math.abs(pct))}%`;
  return "— 0%";
}

export function formatPct(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

/** "2026-09-19" → "Sep 19" */
export function formatMonthDay(key: string): string {
  const m = Number(key.slice(5, 7));
  const d = Number(key.slice(8, 10));
  return `${MONTH_NAMES[m - 1]} ${d}`;
}

/** "21:40" from "2026-09-18T21:40:00+08:00" */
export function formatTime(timestamp: string): string {
  return timestamp.slice(11, 16);
}
