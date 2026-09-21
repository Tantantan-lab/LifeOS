/**
 * Demo summary printer — mirrors the API's analytics.build_summary math over
 * the mock generator stream, so the static demo's insight snapshot can be
 * regenerated whenever the generator changes.
 *
 *   npx tsx --tsconfig ./tsconfig.json scripts/demo-summary.ts
 *
 * Prints the week/month windows ending at the demo "today" (MOCK_LAST_DATE)
 * with totals, bounded deltas and goal completion — the numbers the insight
 * snapshot sentences must be built from.
 */

import { generateEvents } from "./generator";
import { MOCK_LAST_DATE } from "@/data/constants";
import { addDays, daysBetween } from "@/lib/dates";

const METRICS = [
  "learning.study.minutes",
  "learning.reading.minutes",
  "english.words.reviewed",
  "coding.commits",
  "health.workout.session",
  "health.sleep.minutes",
  "productivity.tasks.completed",
] as const;

const GOALS: Record<string, { mode: "day" | "week" | "band"; target: number }> = {
  "learning.study.minutes": { mode: "day", target: 120 },
  "learning.reading.minutes": { mode: "day", target: 30 },
  "english.words.reviewed": { mode: "day", target: 40 },
  "coding.commits": { mode: "week", target: 10 },
  "health.workout.session": { mode: "week", target: 3 },
  "health.sleep.minutes": { mode: "band", target: 420 },
  "productivity.tasks.completed": { mode: "week", target: 15 },
};

function deltaPctOf(now: number, then: number): number {
  if (then <= 0) return now > 0 ? 100 : 0;
  if (then < now * 0.01) return 100;
  return Math.max(-999, Math.min(999, ((now - then) / then) * 100));
}

function windowSum(events: ReturnType<typeof generateEvents>, metric: string, from: string, to: string): number {
  let sum = 0;
  for (let d = from; daysBetween(d, to) >= 0; d = addDays(d, 1)) {
    for (const e of events) {
      if (e.metric === metric && e.local_date === d) sum += e.value;
    }
  }
  return sum;
}

function report(period: "week" | "month") {
  const today = MOCK_LAST_DATE;
  const days = period === "week" ? 7 : 30;
  const start = addDays(today, -(days - 1));
  const prevStart = addDays(start, -days);
  const prevEnd = addDays(start, -1);
  const win90Start = addDays(today, -89);
  const prev90Start = addDays(win90Start, -90);

  const events = generateEvents();
  console.log(`\n=== ${period} ${start}..${today} (days=${days}) ===`);
  for (const metric of METRICS) {
    const total = windowSum(events, metric, start, today);
    const prev = windowSum(events, metric, prevStart, prevEnd);
    const last90 = windowSum(events, metric, win90Start, today);
    const prev90 = windowSum(events, metric, prev90Start, addDays(win90Start, -1));
    const goal = GOALS[metric];
    let completion = 0;
    if (goal.mode === "day") completion = Math.min(1, total / days / goal.target);
    else if (goal.mode === "week") completion = Math.min(1, total / (days / 7) / goal.target);
    else {
      const avg = total / days;
      completion = avg >= 390 && avg <= 450 ? 1 : 0.5;
    }
    console.log(
      `${metric}: total=${total} avg=${(total / days).toFixed(1)} prev=${prev} ` +
      `delta=${deltaPctOf(total, prev)} 90=${last90} prev90=${prev90} delta90=${deltaPctOf(last90, prev90)} ` +
      `completion=${completion.toFixed(3)}`
    );
  }
}

report("week");
report("month");
