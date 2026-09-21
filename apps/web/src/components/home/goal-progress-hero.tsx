"use client";

import type { GoalProgress } from "@/data/types";
import { Panel } from "@/components/primitives/panel";
import { ProgressBar } from "@/components/primitives/progress-bar";
import { GOAL_PROGRESS_EYEBROW, GOAL_PROGRESS_NEVER_SCORE, GOAL_PROGRESS_READY } from "@/lib/copy";
import { useLocale } from "@/components/i18n/locale-provider";
import { t, tStatus } from "@/lib/i18n";

/**
 * "How am I doing?" — the hero. Deliberately framed as readiness against
 * a target ("72% ready"), NEVER as a "Life Score".
 */
export function GoalProgressHero({ progress }: { progress: GoalProgress }) {
  const { locale } = useLocale();
  const zh = locale === "zh";
  return (
    <Panel>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-micro uppercase tracking-[0.14em] text-fg-muted">
              {GOAL_PROGRESS_EYEBROW}
            </span>
            <span className="rounded-full border border-border px-2 py-0.5 text-micro text-fg-secondary">
              {zh ? `等级 ${progress.level}` : `Level ${progress.level}`}
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="num text-hero font-semibold leading-none text-fg">
              {progress.overall === null ? "—" : progress.overall}
            </span>
            <span className="text-h1 text-fg-secondary">%</span>
            <span className="text-h2 text-fg-secondary">{t(locale, GOAL_PROGRESS_READY)}</span>
          </div>
          <ProgressBar value={(progress.overall ?? 0) / 100} className="mt-4 max-w-xs" />
          <div className="mt-3 text-micro text-fg-muted">
            {progress.updatedLabel} · {zh ? `${progress.evidenceDays} ${t(locale, "days of evidence")}` : `${progress.evidenceDays} days of evidence`}
          </div>
        </div>

        <div className="w-full max-w-md space-y-2.5">
          {progress.skills.map((skill) => (
            <div key={skill.skill} className="flex items-center gap-3">
              <span className="w-24 shrink-0 truncate text-meta text-fg-secondary">
                {skill.skill}
              </span>
              <ProgressBar value={(skill.score ?? 0) / 100} className="h-1" />
              <span className="num w-8 shrink-0 text-right text-meta text-fg-muted">
                {skill.score ?? "—"}%
              </span>
              <span
                className="w-20 shrink-0 truncate text-right text-micro text-fg-muted"
                title={skill.evidence}
              >
                {tStatus(locale, skill.status)}
              </span>
            </div>
          ))}
          <div className="pt-1 text-micro text-fg-muted">
            {t(locale, GOAL_PROGRESS_NEVER_SCORE)}
          </div>
        </div>
      </div>
    </Panel>
  );
}
