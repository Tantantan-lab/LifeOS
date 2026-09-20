import type { SkillBenchmark } from "@/data/types";
import { TARGET_LABEL } from "@/data/constants";
import { Panel } from "@/components/primitives/panel";

/**
 * YOU vs TARGET — benchmark position, not ranking. Language is strictly
 * "You 50 · Target 85 · Gap 35 pts". No percentiles, no "you beat X% of
 * people": other people's data only sets the coordinates.
 */
export function BenchmarkBars({ skills }: { skills: SkillBenchmark[] }) {
  const scaleMax = 100;
  return (
    <Panel>
      <h2 className="text-h2 font-semibold text-fg">
        Benchmark · {TARGET_LABEL}
      </h2>
      <p className="mt-1 text-sm text-fg-secondary">
        Your position against the target role. Others only set the coordinates.
      </p>

      <div className="mt-5 space-y-4">
        {skills.map((skill) => {
          const score = skill.score ?? 0;
          return (
            <div key={skill.skill} className="flex items-center gap-3">
              <span className="w-24 shrink-0 truncate text-sm text-fg-secondary">
                {skill.skill}
                <span className="block truncate text-micro text-fg-muted">
                  {skill.status}
                </span>
              </span>
              <div className="relative h-2.5 min-w-0 flex-1 rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${(score / scaleMax) * 100}%` }}
                />
                <span
                  aria-hidden
                  className="absolute top-1/2 h-3.5 w-0.5 -translate-y-1/2 rounded-full bg-fg-secondary"
                  style={{ left: `${(skill.target / scaleMax) * 100}%` }}
                  title={`Target ${skill.target}`}
                />
              </div>
              <span className="num w-52 shrink-0 text-right text-meta text-fg-muted">
                You {skill.score ?? "—"} · Target {skill.target} ·{" "}
                {skill.gap === null
                  ? "Not assessed"
                  : skill.gap === 0
                    ? "Met"
                    : `Gap ${skill.gap} pts`}
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
