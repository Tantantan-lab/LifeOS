"use client";

import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/primitives/panel";
import { useLocale } from "@/components/i18n/locale-provider";
import { t } from "@/lib/i18n";

export function ComingSoon({
  title,
  description,
  milestone,
  bullets,
}: {
  title: string;
  description: string;
  milestone: string;
  bullets: string[];
}) {
  const { locale } = useLocale();
  return (
    <Panel className="max-w-2xl">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-h2 font-semibold text-fg">{t(locale, title)}</h2>
        <Badge
          variant="secondary"
          className="rounded-full border-border bg-surface-2 px-2.5 py-0.5 text-micro font-normal text-fg-secondary"
        >
          {t(locale, "Planned ·")} {milestone}
        </Badge>
      </div>
      <p className="mt-1.5 text-fg-secondary">{t(locale, description)}</p>
      <ul className="mt-4 space-y-1.5 text-sm text-fg-secondary">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex gap-2.5">
            <span aria-hidden className="text-fg-muted">
              —
            </span>
            {t(locale, bullet)}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
