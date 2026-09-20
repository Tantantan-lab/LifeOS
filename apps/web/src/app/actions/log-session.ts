"use server";

import { revalidatePath } from "next/cache";
import { insertManualEvent } from "@/data/db";
import { invalidateEventIndex } from "@/data/selectors";
import type { Domain } from "@/data/types";

/**
 * The closing link of the decision loop: NBA timer → manual Event →
 * analytics re-read. Manual rows carry source='manual', confidence 1.0
 * and event_id 'manual:{metric}:{ts}' — mock/connector rows untouched.
 */
export async function logSession(
  metric: string,
  domain: Domain,
  minutes: number
): Promise<void> {
  await insertManualEvent({
    metric,
    domain,
    minutes: Math.max(1, Math.round(minutes)),
    metadata: { logged_via: "nba_timer" },
  });
  invalidateEventIndex();
  revalidatePath("/");
  revalidatePath("/today");
  revalidatePath("/goals");
}
