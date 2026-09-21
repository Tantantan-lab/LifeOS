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

const ZH_WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

/** "2026-09-19" → "2026年9月19日 周六" — the zh counterpart of formatDateLong. */
export function formatDateLongZh(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return `${y}年${m}月${d}日 ${ZH_WEEKDAYS[weekdayOfZh(key)]}`;
}

// local pure weekday (0=Sun) — mirrors lib/dates without importing to keep
// this module dependency-free for the client bundle.
function weekdayOfZh(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  // Howard Hinnant days_from_civil
  const yy = m <= 2 ? y - 1 : y;
  const era = Math.floor(yy / 400);
  const yoe = yy - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return (((era * 146097 + doe - 719468 + 4) % 7) + 7) % 7;
}

/** "21:40" from "2026-09-18T21:40:00+08:00" */
export function formatTime(timestamp: string): string {
  return timestamp.slice(11, 16);
}

/**
 * Percentage delta with the "no exploding percentages" bound: a zero or
 * negligible (< 1% of now) baseline is new data (+100%); otherwise clamp
 * to ±999% — past ~10x a percentage stops meaning anything to a reader.
 * The API's analytics._delta mirrors this rule.
 */
export function deltaPctOf(now: number, then: number): number {
  if (then <= 0) return now > 0 ? 100 : 0;
  if (then < now * 0.01) return 100;
  return Math.max(-999, Math.min(999, ((now - then) / then) * 100));
}

/** "just now" / "5 min ago" / "3 h ago" / "2 d ago" — sync-status display. */
export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}
