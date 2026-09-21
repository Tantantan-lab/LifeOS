"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Square, Check } from "lucide-react";
import type { NextBestAction } from "@/data/types";
import { Panel } from "@/components/primitives/panel";
import { DomainDot } from "@/components/primitives/domain-chip";
import { logSession } from "@/app/actions/log-session";
import { useLocale } from "@/components/i18n/locale-provider";
import { t, zhValue } from "@/lib/i18n";
import { formatPct } from "@/lib/format";

/** zh for the selector-composed title/reason sentences. */
function zhTitle(title: string, locale: "en" | "zh"): string {
  if (locale !== "zh") return title;
  return title
    .replace(/^(.*) · \+(\d+) min$/, "$1 · +$2 分钟")
    .replace(/^(.*) · \+(\d+) more$/, "$1 · 再+$2");
}

function zhReason(reason: string, locale: "en" | "zh"): string {
  if (locale !== "zh") return reason;
  const m = reason.match(/^(.+) averaged (.+) over the last 30 days, against a target of (.+)\.$/);
  if (m) return `${m[1]} 近 30 天平均 ${zhValue(m[2])}，目标为 ${m[3]}。`;
  return reason;
}

/**
 * The Decision Interface — LifeOS is data → decision → action → new data,
 * not a BI dashboard. The recommended step sits at the top of Home with
 * its evidence ("Why now?") and a Start button that runs a session timer;
 * completing it writes a manual Event and re-derives the recommendation.
 */
export function NextActionCard({ action }: { action: NextBestAction }) {
  const { locale } = useLocale();
  const zh = locale === "zh";
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  const canStart = action.minutes > 0; // duration metrics only — others are display-only

  async function complete() {
    setSaving(true);
    try {
      await logSession(action.metric, action.domain, Math.max(1, Math.round(elapsed / 60)));
      router.refresh();
    } finally {
      setSaving(false);
      setRunning(false);
      setElapsed(0);
    }
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const ringPct = action.minutes > 0 ? Math.min(1, elapsed / 60 / action.minutes) : 0;
  const r = 24;
  const c = 2 * Math.PI * r;

  return (
    <Panel className="relative overflow-hidden">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <DomainDot domain={action.domain} />
            <span className="text-micro uppercase tracking-[0.14em] text-fg-muted">
              {t(locale, "Next Best Action")}
            </span>
          </div>
          <div className="num mt-1 text-display font-medium leading-tight text-fg">
            {zh
              ? `${t(locale, action.label)}${zhTitle(action.title.replace(action.label, ""), locale)}`
              : action.title}
          </div>
          <div className="mt-2 max-w-xl text-sm text-fg-secondary">
            <span className="text-fg-muted">{zh ? "为什么现在？" : "Why now? "}</span>
            {zhReason(action.reason, locale)}
          </div>
        </div>

        {canStart && (
          <div className="flex shrink-0 items-center gap-4">
            {running ? (
              <>
                <div className="relative size-16">
                  <svg viewBox="0 0 56 56" className="size-16 -rotate-90">
                    <circle cx="28" cy="28" r={r} fill="none" stroke="var(--color-surface-2)" strokeWidth="4" />
                    <circle
                      cx="28" cy="28" r={r} fill="none" stroke="var(--color-brand)" strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={`${ringPct * c} ${c}`}
                    />
                  </svg>
                  <span className="num absolute inset-0 flex items-center justify-center text-sm text-fg">
                    {mm}:{ss}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={complete}
                  className="inline-flex items-center gap-2 rounded-[10px] bg-brand-strong px-4 py-2 text-sm font-medium text-fg transition-colors hover:opacity-90 disabled:opacity-60"
                >
                  <Check className="size-4" />
                  {saving ? t(locale, "Logging…") : t(locale, "Complete & log")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRunning(false);
                    setElapsed(0);
                  }}
                  className="rounded-[10px] border border-border p-2 text-fg-muted transition-colors hover:text-fg"
                  aria-label={t(locale, "Cancel session")}
                >
                  <Square className="size-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setRunning(true)}
                className="inline-flex items-center gap-2 rounded-[10px] bg-brand-strong px-5 py-2.5 text-sm font-medium text-fg transition-colors hover:opacity-90"
              >
                <Play className="size-4" />
                {zh ? `开始 ${action.minutes} 分钟计时` : `Start ${action.minutes}-minute session`}
              </button>
            )}
          </div>
        )}
      </div>

      {running && (
        <div className="mt-3 border-t border-border pt-2 text-micro text-fg-muted">
          {zh
            ? `计时中——自然结束或提前完成均可；已记录的分钟数都算数。建议时段的 ${formatPct(ringPct)}。`
            : `Timer running — finish naturally or complete early; any logged minutes count. ${formatPct(ringPct)} of the suggested session.`}
        </div>
      )}
    </Panel>
  );
}
