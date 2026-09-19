/**
 * Real "today" in the owner's timezone (Asia/Shanghai). Server-only.
 *
 * MUST be called per invocation, never cached at module scope: a long-lived
 * server instance would otherwise freeze midnight and "Today" would rot.
 * TODO(M3+): read the timezone from users.timezone instead of the constant.
 */

export const LIFEOS_TIMEZONE = "Asia/Shanghai";

export function todayKey(): string {
  // en-CA yields "YYYY-MM-DD"
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LIFEOS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
