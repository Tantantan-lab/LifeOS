/**
 * Real "today" in the owner's timezone (Asia/Shanghai). Server-only.
 *
 * MUST be called per invocation, never cached at module scope: a long-lived
 * server instance would otherwise freeze midnight and "Today" would rot.
 * TODO(M3+): read the timezone from users.timezone instead of the constant.
 */

import { MOCK_LAST_DATE } from "@/data/constants";
import { DEMO_MODE } from "@/lib/demo";

export const LIFEOS_TIMEZONE = "Asia/Shanghai";

export function todayKey(): string {
  // Demo: freeze "today" to the mock dataset's last day so the showcase
  // always reads as current data (the generator is anchored there).
  if (DEMO_MODE) return MOCK_LAST_DATE;
  // en-CA yields "YYYY-MM-DD"
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LIFEOS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
