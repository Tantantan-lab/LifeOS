"use client";

import { useState } from "react";
import type { Domain, MeVsMeWindow, WindowKey } from "@/data/types";
import { WINDOW_ORDER } from "@/data/constants";
import { Panel } from "@/components/primitives/panel";
import { SegmentedControl } from "@/components/primitives/segmented-control";
import { SectionHeading } from "@/components/primitives/section-heading";
import { VersusTable } from "@/components/me-vs-me/versus-table";
import { TrendLine } from "@/components/charts/trend-line";
import { useLocale } from "@/components/i18n/locale-provider";
import { t, monthDayZh } from "@/lib/i18n";

/** "Aug 21 – Sep 19" → zh "8月21日–9月19日". */
function zhRange(range: string): string {
  return range
    .split(" – ")
    .map((d) => monthDayZh(d))
    .join("–");
}

/**
 * Client shell holding window + selected-domain state. The server parent
 * fetches all four windows up front — switching tabs is zero refetch.
 */
export function MeVsMeExplorer({
  windows,
}: {
  windows: Record<WindowKey, MeVsMeWindow>;
}) {
  const [key, setKey] = useState<WindowKey>("90D");
  const [selected, setSelected] = useState<Domain>("learning");
  const { locale } = useLocale();
  const zh = locale === "zh";

  const win = windows[key];
  const row = win.rows.find((r) => r.domain === selected) ?? win.rows[0];

  const options = WINDOW_ORDER.map((k) => ({ value: k, label: k === "Beginning" ? t(locale, k) : k }));

  return (
    <div className="space-y-5">
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl
            value={key}
            onChange={setKey}
            options={options}
            ariaLabel="Comparison window"
          />
          <div className="num text-micro text-fg-muted">
            {zh
              ? `${t(locale, "NOW:")} ${zhRange(win.nowRange)} ${t(locale, "· THEN:")} ${zhRange(win.thenRange)}`
              : `NOW: ${win.nowRange} · THEN: ${win.thenRange}`}
          </div>
        </div>
        <div className="mt-4">
          <VersusTable rows={win.rows} selected={selected} onSelect={setSelected} />
        </div>
      </Panel>

      <Panel>
        <SectionHeading
          title={
            zh
              ? `${t(locale, row.label)} · ${zhRange(win.nowRange)}`
              : `${row.label} · ${win.nowRange}`
          }
        />
        <TrendLine row={row} />
        <div className="mt-2 text-micro text-fg-muted">
          {t(locale, "Weekly totals · dashed line = THEN average")}
        </div>
      </Panel>
    </div>
  );
}
