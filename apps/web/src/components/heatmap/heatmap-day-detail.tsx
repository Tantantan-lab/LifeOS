"use client";

import { X } from "lucide-react";
import type { HeatmapDay } from "@/data/types";
import { HEATMAP_DOMAINS, HEATMAP_META } from "@/data/constants";
import { DomainDot } from "@/components/primitives/domain-chip";
import { useLocale } from "@/components/i18n/locale-provider";
import { t, zhValue } from "@/lib/i18n";
import { formatDateLong } from "@/lib/dates";
import { formatDateLongZh } from "@/lib/format";
import { noLogged } from "@/lib/copy";
import { formatCount, formatDuration, formatPct } from "@/lib/format";

/**
 * Click-a-day breakdown: what happened that day, per heatmap domain,
 * plus the overall Daily Goal percentage. Tone: empty domains read
 * "No X logged", never "missed".
 */
export function HeatmapDayDetail({
  day,
  onClose,
}: {
  day: HeatmapDay;
  onClose: () => void;
}) {
  const { locale } = useLocale();
  const zh = locale === "zh";
  const dateLabel = zh ? formatDateLongZh(day.date) : formatDateLong(day.date);
  const fmtDuration = (m: number) => (zh ? zhValue(formatDuration(m)) : formatDuration(m));

  return (
    <div
      className="mt-4 rounded-[10px] border border-border bg-surface-2/60 p-4"
      role="dialog"
      aria-label={`Day detail for ${dateLabel}`}
    >
      <div className="flex items-center gap-2">
        <span className="num text-sm font-medium text-fg">
          {dateLabel}
        </span>
        <span className="num ml-auto text-sm text-fg-secondary">
          {zh ? `当日目标：${formatPct(day.completionAll)}` : `Daily Goal: ${formatPct(day.completionAll)}`}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label={zh ? "关闭当日详情" : "Close day detail"}
          className="rounded-[6px] p-1 text-fg-muted transition-colors hover:bg-surface-1 hover:text-fg"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {HEATMAP_DOMAINS.map((domain) => {
          const cell = day[domain];
          const meta = HEATMAP_META[domain];
          const label = t(locale, meta.label);
          const valueLabel = zh
            ? cell.value === 0
              ? `无${label}记录`
              : `${cell.displayValue} ${t(locale, meta.unit)}`
            : cell.value === 0
              ? noLogged(meta.label)
              : `${cell.displayValue} ${meta.unit}`;
          return (
            <div
              key={domain}
              className="flex items-center gap-2.5 rounded-[8px] border border-border bg-surface-1 px-3 py-2"
            >
              <DomainDot domain={domain} />
              <span className="min-w-0 flex-1 truncate text-sm text-fg-secondary">
                {label}
              </span>
              <span className="num shrink-0 text-sm text-fg">{valueLabel}</span>
              <span className="num w-10 shrink-0 text-right text-micro text-fg-muted">
                {formatPct(cell.completion)}
              </span>
            </div>
          );
        })}
      </div>

      {day.workouts.length > 0 && (
        <div className="mt-3 rounded-[8px] border border-border bg-surface-1 p-3">
          <div className="flex items-center gap-2">
            <DomainDot domain="fitness" />
            <span className="text-sm font-medium text-fg">{t(locale, "Workouts")}</span>
            <span className="num ml-auto text-micro text-fg-muted">
              {zh
                ? `${day.workouts.length} 次`
                : `${day.workouts.length} session${day.workouts.length === 1 ? "" : "s"}`}
            </span>
          </div>
          {day.workouts.map((session, i) => (
            <div key={i} className="mt-2 border-t border-border pt-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-sm text-fg">{session.title}</span>
                <span className="num shrink-0 text-micro text-fg-muted">
                  {[
                    session.minutes != null ? fmtDuration(session.minutes) : null,
                    session.kcal != null ? `${session.kcal} kcal` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
              {session.movements.length > 0 && (
                <div className="mt-1 text-micro text-fg-muted">
                  {session.movements.join(" · ")}
                </div>
              )}
              {session.topWeights.length > 0 && (
                <div className="mt-1 text-micro text-fg-muted">
                  {t(locale, "Top weights: ")}
                  {session.topWeights
                    .map((w) => `${w.name} ${formatCount(w.weight)}${w.unit ?? ""}`)
                    .join(" · ")}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-micro text-fg-muted">
        <span>{t(locale, "Streak through this day")}</span>
        <span className="num text-fg-secondary">
          {zh
            ? `${day.streak} 天`
            : `${day.streak} ${day.streak === 1 ? "day" : "days"}`}
        </span>
      </div>
    </div>
  );
}
