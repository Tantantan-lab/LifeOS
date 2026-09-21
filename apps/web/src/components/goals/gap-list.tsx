"use client";

import type { GapItem } from "@/data/types";
import { Panel } from "@/components/primitives/panel";
import { useLocale } from "@/components/i18n/locale-provider";
import { t } from "@/lib/i18n";

/** zh for the selector-composed note strings (numbers stay first). */
function zhNote(locale: "en" | "zh", note: string): string {
  if (locale !== "zh") return note;
  return note
    .replace(/^~(\d+) weeks at your current pace$/, "按当前速度约 $1 周")
    .replace(/^(.+) at your current pace$/, "按当前速度$1");
}

/** Ranked gaps with evidence-based pace estimates — where to go next. */
export function GapList({ gaps }: { gaps: GapItem[] }) {
  const { locale } = useLocale();
  const zh = locale === "zh";
  return (
    <Panel>
      <h2 className="text-h2 font-semibold text-fg">{t(locale, "Gap")}</h2>
      <p className="mt-1 text-sm text-fg-secondary">
        {t(locale, "What to close next, ordered by distance to target.")}
      </p>

      <ol className="mt-4 space-y-2">
        {gaps.map((gap) => (
          <li
            key={gap.skill}
            className="flex items-center gap-3 rounded-[10px] border border-border bg-surface-2/60 px-3 py-2.5"
          >
            <span className="num w-6 shrink-0 text-display font-medium text-fg-muted">
              {gap.rank}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
              {gap.skill}
            </span>
            <span className="num shrink-0 rounded-full border border-border px-2.5 py-0.5 text-meta text-fg-secondary">
              {zh
                ? gap.gapLabel.replace(/^Not assessed$/, t(locale, "Not assessed")).replace(/(\d+) pts$/, "$1 分")
                : gap.gapLabel}
            </span>
            <span className="hidden shrink-0 text-sm text-fg-muted md:block">
              {zh ? t(locale, gap.note) || zhNote(locale, gap.note) : gap.note}
            </span>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
