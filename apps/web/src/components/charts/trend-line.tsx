"use client";

import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { VersusRow } from "@/data/types";
import { TREND_TEXT_CLASS } from "@/lib/domain-colors";
import { formatMonthDay } from "@/lib/format";
import { formatCount } from "@/lib/format";

const DURATION_DOMAINS = ["study", "coding", "sleep"];

/**
 * Weekly rollups of the NOW window, colored by trend (never by domain),
 * with the THEN average as a dashed reference — the comparison must be
 * visible, not inferred. Requires an explicit-height container:
 * ResponsiveContainer inside an unconstrained grid item collapses to 0.
 */
export function TrendLine({ row }: { row: VersusRow }) {
  const isDuration = DURATION_DOMAINS.includes(row.domain);
  const data = row.series.weekly.map((p) => ({
    label: formatMonthDay(p.label),
    value: p.value,
  }));

  const formatValue = (v: number) =>
    isDuration ? (v >= 60 ? `${Math.round(v / 60)}h` : `${Math.round(v)}m`) : formatCount(v);

  return (
    <div className={TREND_TEXT_CLASS[row.trend]}>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--color-fg-muted)", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "var(--color-border)" }}
              minTickGap={28}
            />
            <YAxis
              width={38}
              tick={{ fill: "var(--color-fg-muted)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatValue}
            />
            <Tooltip
              formatter={(value) => [formatValue(Number(value)), row.metricLabel]}
              contentStyle={{
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                borderRadius: 10,
                fontSize: 13,
              }}
              itemStyle={{ color: "var(--color-fg)" }}
              labelStyle={{ color: "var(--color-fg-secondary)" }}
            />
            <ReferenceLine
              y={row.series.thenAvg}
              stroke="var(--color-fg-muted)"
              strokeDasharray="4 4"
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="currentColor"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
