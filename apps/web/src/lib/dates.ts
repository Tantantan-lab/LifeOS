/**
 * Pure date arithmetic on "YYYY-MM-DD" keys.
 *
 * Deliberately contains NO `new Date()`: static prerendering must produce
 * identical output at build time and request time, with zero timezone drift.
 * Weekday indexing: 0 = Sunday … 6 = Saturday (GitHub-heatmap convention).
 */

export type DateKey = string; // "YYYY-MM-DD"

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Howard Hinnant's days_from_civil — days since 1970-01-01. */
function daysFromCivil(y: number, m: number, d: number): number {
  y -= m <= 2 ? 1 : 0;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

/** Inverse of daysFromCivil. */
function civilFromDays(z: number): [number, number, number] {
  z += 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365
  );
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp + (mp < 10 ? 3 : -9);
  return [y + (m <= 2 ? 1 : 0), m, d];
}

export function dateKeyToDays(key: DateKey): number {
  const [y, m, d] = key.split("-").map(Number);
  return daysFromCivil(y, m, d);
}

export function daysToDateKey(days: number): DateKey {
  const [y, m, d] = civilFromDays(days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function addDays(key: DateKey, n: number): DateKey {
  return daysToDateKey(dateKeyToDays(key) + n);
}

export function daysBetween(from: DateKey, to: DateKey): number {
  return dateKeyToDays(to) - dateKeyToDays(from);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOf(key: DateKey): number {
  return (((dateKeyToDays(key) + 4) % 7) + 7) % 7;
}

/** The most recent Sunday on or before `key`. */
export function sundayOnOrBefore(key: DateKey): DateKey {
  return addDays(key, -weekdayOf(key));
}

export function monthKeyOf(key: DateKey): string {
  return key.slice(0, 7); // "2026-09"
}

export function monthShortOf(key: DateKey): string {
  const m = Number(key.slice(5, 7));
  return MONTH_NAMES[m - 1];
}

/** "Fri, Sep 18, 2026" — used by the heatmap tooltip. */
export function formatDateLong(key: DateKey): string {
  const [, m, d] = key.split("-").map(Number);
  return `${WEEKDAY_NAMES[weekdayOf(key)]}, ${MONTH_NAMES[m - 1]} ${d}, ${key.slice(0, 4)}`;
}

/** "Aug 21 – Sep 19" — used by the Me vs Me window caption. */
export function formatRange(from: DateKey, to: DateKey): string {
  const [, mf, df] = from.split("-").map(Number);
  const [, mt, dt] = to.split("-").map(Number);
  return `${MONTH_NAMES[mf - 1]} ${df} – ${MONTH_NAMES[mt - 1]} ${dt}`;
}
