import type { Domain } from "@/data/types";

/**
 * Write path for session logs — a conditional dynamic import of the server
 * action. Static demo builds can't bundle server actions (output: "export"
 * forbids them), so the env check MUST be inline in THIS file: NEXT_PUBLIC_
 * vars are replaced per-file at build time, and an imported constant would
 * defeat the dead-code elimination that drops the action import in demo
 * builds (the reverse holds for normal builds).
 */
export async function logSessionNow(
  metric: string,
  domain: Domain,
  minutes: number
): Promise<void> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "1") return; // static site — nothing to write to
  const { logSession } = await import("@/app/actions/log-session");
  await logSession(metric, domain, minutes);
}
