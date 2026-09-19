"use client";

import { useState } from "react";
import type { Domain, MeVsMeWindow, WindowKey } from "@/data/types";
import { WINDOW_ORDER } from "@/data/constants";
import { Panel } from "@/components/primitives/panel";
import { SegmentedControl } from "@/components/primitives/segmented-control";
import { SectionHeading } from "@/components/primitives/section-heading";
import { VersusTable } from "@/components/me-vs-me/versus-table";
import { TrendLine } from "@/components/charts/trend-line";

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

  const win = windows[key];
  const row = win.rows.find((r) => r.domain === selected) ?? win.rows[0];

  return (
    <div className="space-y-5">
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl
            value={key}
            onChange={setKey}
            options={WINDOW_ORDER.map((k) => ({ value: k, label: k }))}
            ariaLabel="Comparison window"
          />
          <div className="num text-micro text-fg-muted">
            NOW: {win.nowRange} · THEN: {win.thenRange}
          </div>
        </div>
        <div className="mt-4">
          <VersusTable rows={win.rows} selected={selected} onSelect={setSelected} />
        </div>
      </Panel>

      <Panel>
        <SectionHeading
          title={`${row.label} · ${win.nowRange}`}
        />
        <TrendLine row={row} />
        <div className="mt-2 text-micro text-fg-muted">
          Weekly totals · dashed line = THEN average
        </div>
      </Panel>
    </div>
  );
}
