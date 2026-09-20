"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  ArrowRight, ArrowUp, BookOpen, Check, ChevronLeft, ChevronRight, Circle,
  Code2, Dumbbell, Info, Languages, Moon, PenLine, Search, Sun, Target,
} from "lucide-react";
import type {
  DomainSummary, GapItem, GoalProgress, GoalRow, HeaderStatus, HeatmapDay,
  HeatmapStats, InsightRecord, InsightTrendRow, MeVsMeWindow, NextBestAction,
  TodayItem, WindowKey,
} from "@/data/types";
import { useLocale } from "@/components/i18n/locale-provider";
import { buildGrid } from "@/components/heatmap/heatmap-geometry";
import { formatDateLong } from "@/lib/dates";
import { formatDateLongZh } from "@/lib/format";
import { todayKey } from "@/lib/today";
import { logSession } from "@/app/actions/log-session";

export interface DashboardData {
  progress: GoalProgress;
  summaries: DomainSummary[];
  heatmap: { gridStart: string; days: HeatmapDay[] };
  heatmapStats: HeatmapStats;
  today: TodayItem[];
  meVsMe: Record<WindowKey, MeVsMeWindow>;
  goals: GoalRow[];
  gaps: GapItem[];
  insight: InsightRecord | null;
  trends: InsightTrendRow[];
  header: HeaderStatus;
  todayCompletion: number | null;
  nextAction: NextBestAction | null;
}

type Accent = "blue" | "purple" | "green" | "orange";

function pct(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

const activityCards: { label: string; value: string; change: string; accent: Accent; icon: typeof BookOpen; bars: number[] }[] = [
  { label: "Study", value: "2h 16m", change: "+24%", accent: "blue", icon: BookOpen, bars: [34, 50, 42, 61, 74, 38, 65, 48, 72, 55, 81, 49] },
  { label: "English", value: "43m", change: "+31%", accent: "purple", icon: Languages, bars: [32, 46, 54, 39, 65, 44, 58, 38, 61, 55, 69, 41] },
  { label: "Fitness", value: "58m", change: "+12%", accent: "green", icon: Dumbbell, bars: [31, 58, 47, 39, 67, 42, 61, 53, 64, 55, 72, 43] },
  { label: "Coding", value: "1h 21m", change: "+18%", accent: "orange", icon: Code2, bars: [40, 50, 46, 64, 49, 67, 53, 46, 68, 52, 78, 61] },
  { label: "Sleep", value: "7h 12m", change: "+0.4h", accent: "purple", icon: Moon, bars: [39, 49, 60, 35, 42, 63, 47, 56, 45, 68, 83, 51] },
];

const dayRows = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function Panel({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <section className={`life-panel ${className}`}>{children}</section>;
}

function SmallLink({ href = "#", children = "View more" }: { href?: string; children?: React.ReactNode }) {
  return <Link href={href} className="inline-flex items-center gap-1 text-[11px] text-[#6f8fff] transition hover:text-[#9bb0ff]">{children} <ArrowRight className="size-3" /></Link>;
}

function ActivityCard({ card }: { card: (typeof activityCards)[number] }) {
  const Icon = card.icon;
  return (
    <Panel className={`activity-card accent-${card.accent}`}>
      <div className="flex items-center gap-2 text-[13px] text-[#c5cbd6]"><Icon className="size-[19px] text-[var(--accent)]" strokeWidth={1.9} /><span>{card.label}</span></div>
      <div className="mt-3 text-[24px] font-semibold leading-none tracking-[-0.025em] text-white">{card.value}</div>
      <div className="mt-2 flex items-center gap-1 text-[13px] text-[#55d98b]"><ArrowUp className="size-3.5" /> {card.change}</div>
      <div className="mt-3 flex h-8 items-end gap-[6px]">
        {card.bars.map((height, index) => <span key={index} className="w-[5px] rounded-[3px] bg-[var(--accent)] shadow-[0_0_8px_var(--accent-glow)]" style={{ height: `${height}%`, opacity: 0.55 + (index % 3) * 0.18 }} />)}
      </div>
    </Panel>
  );
}

type HeatFilter = "all" | "learning" | "english" | "coding" | "productivity";

function Heatmap({ days, stats, filter, gridStart, locale }: { days: HeatmapDay[]; stats: HeatmapStats; filter: HeatFilter; gridStart: string; locale: "en" | "zh" }) {
  const [selected, setSelected] = useState<HeatmapDay | null>(null);
  const geometry = useMemo(
    () => buildGrid(gridStart, days.map((day) => day.date)),
    [gridStart, days]
  );
  const cells = days.slice(-371).map((day) => filter === "all" ? day.levelAll : day[filter].level);
  const selectedDay = selected;
  return (
    <div className="mt-5 overflow-hidden">
      {/* Month labels aligned to the REAL 53-column geometry (not 12 equal buckets) */}
      <div
        className="ml-10 grid text-[11px] text-[#b1b8c5]"
        style={{ gridTemplateColumns: "repeat(53, minmax(7px, 1fr))", gap: "3px" }}
      >
        {geometry.monthLabels.map((label) => (
          <span key={`${label.label}-${label.col}`} style={{ gridColumn: label.col + 1 }}>{label.label}</span>
        ))}
      </div>
      <div className="mt-3 flex gap-3">
        <div className="grid h-[116px] w-7 shrink-0 grid-rows-7 gap-[3px] text-[11px] leading-none text-[#adb5c3]">{dayRows.map((day) => <span key={day} className="flex items-center">{locale === "zh" ? ({ Mon: "一", Tue: "二", Wed: "三", Thu: "四", Fri: "五", Sat: "六", Sun: "日" }[day] ?? day) : day}</span>)}</div>
        <div className="heatmap-grid" aria-label="Yearly contribution heatmap">
          {cells.map((level, index) => (
            <button
              key={index}
              type="button"
              data-level={level}
              data-selected={selected?.date === days[index].date}
              aria-label={days[index].date}
              onClick={() => setSelected(selected?.date === days[index].date ? null : days[index])}
            />
          ))}
        </div>
      </div>
      {selectedDay && (
        <div className="mt-3 rounded-[10px] bg-[#151a23] p-4">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-white">{locale === "zh" ? formatDateLongZh(selectedDay.date) : formatDateLong(selectedDay.date)}</span>
            <span className="text-[11px] text-[#8d96a6]">{locale === "zh" ? `当日目标：${Math.round(selectedDay.completionAll * 100)}%` : `Daily Goal: ${Math.round(selectedDay.completionAll * 100)}%`}</span>
            <button onClick={() => setSelected(null)} className="text-[#7e8796] hover:text-white" aria-label={locale === "zh" ? "关闭" : "Close"}>×</button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(["learning", "english", "coding", "productivity"] as const).map((domain) => {
              const cell = selectedDay[domain];
              const unit = { learning: "min", english: "words", coding: "commits", productivity: "tasks" }[domain];
              const label = locale === "zh"
                ? ({ learning: "学习", english: "英语", coding: "编程", productivity: "效率" }[domain])
                : ({ learning: "Study", english: "English", coding: "Coding", productivity: "Career" }[domain]);
              const valueText = cell.value === 0
                ? (locale === "zh" ? "无记录" : "No entry")
                : `${cell.displayValue} ${unit}`;
              return (
                <div key={domain} className="flex items-center gap-2 rounded-[8px] bg-[#111720] px-3 py-2">
                  <span className={`size-2 rounded-full ${({ learning: "bg-[#4f8fff]", english: "bg-[#9d5bf4]", coding: "bg-[#e8894d]", productivity: "bg-[#50d887]" }[domain])}`} />
                  <span className="flex-1 truncate text-[12px] text-[#c5cbd6]">{label}</span>
                  <span className="text-[12px] text-white">{valueText}</span>
                  <span className="w-10 text-right text-[11px] text-[#8d96a6]">{Math.round(cell.completion * 100)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="mt-5 flex items-end justify-between">
        <div className="flex gap-12">{[[String(stats.activeDays90d), "active days"], [String(stats.currentStreak), "day streak"], [String(stats.longestStreak), "longest streak"]].map(([value, label]) => <div key={label}><div className="text-[17px] font-semibold text-white">{value}</div><div className="text-[11px] text-[#8d96a6]">{locale === "zh" ? (zhStreak[label] ?? label) : label}</div></div>)}</div>
        <div className="flex items-center gap-1 text-[10px] text-[#929aaa]"><span className="mr-1">{locale === "zh" ? "少" : "Less"}</span>{[0, 1, 2, 3, 4].map((level) => <span key={level} className="size-3 rounded-[3px]" data-heat-level={level} />)}<span className="ml-1">{locale === "zh" ? "多" : "More"}</span></div>
      </div>
    </div>
  );
}


const domainAccent: Record<string, string> = { learning: "blue", english: "purple", health: "green", coding: "orange", productivity: "muted" };

const zhLabels: Record<string, string> = {
  Learning: "学习", English: "英语", Health: "健康", Productivity: "效率",
  "Study time": "学习时长", Reading: "阅读", "Words reviewed": "复习单词",
  Vocabulary: "词汇", Listening: "听力", Speaking: "口语", Sleep: "睡眠",
  Commits: "提交", Coding: "编程", "Tasks completed": "完成任务",
  "IELTS mock": "雅思模考", Workouts: "健身", "Overseas Engineer": "海外工程师", Cloud: "云",
};
const zhStatus: Record<string, string> = {
  "Not started": "未开始", "Not assessed": "未评估",
  Completed: "已完成", Proficient: "熟练", Learning: "学习中",
};
const zhStreak: Record<string, string> = {
  "active days": "活跃天数", "day streak": "连续天数", "longest streak": "最长连续",
};
const zhLabel = (en: string) => zhLabels[en] ?? en;

/** Converts selector-formatted value labels ("1h 59m", "10 words") to zh. */
function zhValue(label: string): string {
  return label
    .replace(/^(\d+)h (\d+)m$/, "$1小时$2分钟")
    .replace(/^(\d+)h$/, "$1小时")
    .replace(/^(\d+)m$/, "$1分钟")
    .replace(/^(\d+) words$/, "$1 词")
    .replace(/^(\d+) commits?$/, "$1 次提交")
    .replace(/^(\d+) tasks?$/, "$1 项任务")
    .replace(/^Band (\S+)$/, "模考 $1")
    .replace(/^(\d+) sessions?$/, "$1 次");
}

function TodayCard({ items, completion, action, locale }: { items: TodayItem[]; completion: number | null; action: NextBestAction | null; locale: "en" | "zh" }) {
  const [isPending, startTransition] = useTransition();
  const [logged, setLogged] = useState(false);
  const pct = Math.round((completion ?? 0) * 100);

  function completeAction() {
    if (!action || isPending) return;
    startTransition(async () => {
      await logSession(action.metric, action.domain, action.minutes);
      setLogged(true);
    });
  }

  return (
    <Panel className="today-card">
      <div className="flex items-center justify-between"><h2 className="text-[18px] font-semibold text-white">{locale === "zh" ? "今天" : "Today"}</h2><SmallLink href="/today">{locale === "zh" ? "查看详情" : "View details"}</SmallLink></div>
      <div className="mt-3 grid grid-cols-[154px_1fr] items-center gap-6">
        <div className="goal-ring" style={{ "--goal-pct": `${pct}%` } as React.CSSProperties}><div><strong>{pct}%</strong><span>{locale === "zh" ? "今日目标" : "Daily Goal"}</span></div></div>
        <div className="space-y-3">{items.length === 0 ? <div className="text-[12px] text-[#8e98a8]">{locale === "zh" ? "今天还没有记录" : "No entries yet today"}</div> : items.slice(0, 5).map((item, index) => <div key={`${item.time}-${item.metricLabel}-${index}`} className="grid grid-cols-[20px_1fr_auto] items-center gap-2 text-[13px]"><span className={`today-check accent-${domainAccent[item.domain]}`}><Check className="size-3" /></span><span className="truncate text-[#c5cbd6]">{locale === "zh" ? zhLabel(item.metricLabel) : item.metricLabel}</span><span className="text-[#e8ebf0]">{locale === "zh" ? zhValue(item.valueLabel) : item.valueLabel}</span></div>)}</div>
      </div>
      {action && <div className="mt-4 grid grid-cols-[44px_1fr_34px] items-start gap-3 rounded-[10px] bg-[#151b25] p-3.5">
        <span className="flex size-10 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#376eff] to-[#6675ff] text-white shadow-[0_8px_20px_#3162ff33]"><PenLine className="size-4" /></span>
        <div><div className="text-[11px] text-[#9ea7b5]">{locale === "zh" ? "下一步行动" : "Next Best Action"}</div><div className="mt-1 font-semibold text-white">{locale === "zh" ? `${zhLabel(action.label)} · ${action.isDuration ? `+${action.extra} 分钟` : `再 +${action.extra}`}` : action.title}</div><div className="text-[12px] text-[#b2bac7]">{action.isDuration ? `${action.minutes} min` : action.targetLabel}</div><div className="mt-1 line-clamp-2 text-[11px] leading-4 text-[#8e98a8]">{locale === "zh" ? `原因：${zhLabel(action.label)}近 30 天平均 ${action.currentLabel}，目标 ${action.targetLabel}。` : "Reason: " + action.reason}</div>{logged && <div className="mt-1 text-[11px] text-[#52db89]">{locale === "zh" ? "已记录" : "Logged"}</div>}</div>
        <button onClick={completeAction} disabled={isPending || logged || !action.isDuration} className="mt-1 flex size-8 items-center justify-center rounded-full bg-[#252d3c] text-white disabled:opacity-50" aria-label={locale === "zh" ? "记录下一步行动" : "Log next action"}>{logged ? <Check className="size-4" /> : <ArrowRight className="size-4" />}</button>
      </div>}
    </Panel>
  );
}

const domainIcon = { learning: BookOpen, english: Languages, health: Dumbbell, coding: Code2, productivity: Target };

function MeVsMe({ windows, locale }: { windows: Record<WindowKey, MeVsMeWindow>; locale: "en" | "zh" }) {
  const [windowKey, setWindowKey] = useState<WindowKey>("30D");
  const rows = windows[windowKey].rows.slice(0, 5);
  return (
    <Panel className="bottom-card">
      <div className="flex items-center justify-between"><div className="flex items-center gap-4"><h2>{locale === "zh" ? "今昔对比" : "Me vs Me"}</h2><div className="dash-tabs">{(["30D", "90D", "1Y", "Beginning"] as WindowKey[]).map((key) => <button key={key} onClick={() => setWindowKey(key)} className={windowKey === key ? "active" : ""}>{key === "Beginning" ? (locale === "zh" ? "全部" : "All") : key}</button>)}</div></div><SmallLink href="/me-vs-me">{locale === "zh" ? "查看更多" : "View more"}</SmallLink></div>
      <div className="mt-4 grid grid-cols-[1fr_82px_22px_82px_58px] items-end text-[10px] text-[#8f98a8]"><span /><span>{locale === "zh" ? "过去" : "Then"}<br />({locale === "zh" ? "对比期" : "previous"})</span><span /><span>{locale === "zh" ? "现在" : "Now"}</span><span>{locale === "zh" ? "变化" : "Change"}</span></div>
      <div className="mt-3 space-y-3.5">{rows.map((row) => { const Icon = domainIcon[row.domain]; const accent = domainAccent[row.domain]; return <div key={row.key} className="grid grid-cols-[1fr_82px_22px_82px_58px] items-center text-[12px]"><span className={`flex items-center gap-3 accent-${accent}`}><Icon className="size-4 text-[var(--accent)]" /><span className="truncate text-[#d6dae2]">{locale === "zh" ? zhLabel(row.label) : row.label}</span></span><span>{row.thenLabel}</span><span className="text-[#667080]">→</span><span>{row.nowLabel}</span><span className={row.deltaPct < 0 ? "text-[#ef766c]" : "text-[#52db89]"}>{pct(row.deltaPct)}</span></div>; })}</div>
    </Panel>
  );
}

function GoalsCard({ progress, locale }: { progress: GoalProgress; locale: "en" | "zh" }) {
  return (
    <Panel className="bottom-card">
      <div className="flex items-center justify-between"><h2>{locale === "zh" ? "目标 / 等级" : "Goals / Level"}</h2><SmallLink href="/goals">{locale === "zh" ? "查看更多" : "View more"}</SmallLink></div>
      <div className="mt-5 flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-[9px] bg-[#18243b] text-[#5687ff]"><Target className="size-[17px]" /></span><div className="min-w-0 flex-1"><div className="text-[12px] font-medium text-white">{locale === "zh" ? zhLabel(progress.targetLabel) : progress.targetLabel}</div><div className="text-[11px] text-white">{locale === "zh" ? "等级" : "Level"} {progress.level}</div></div></div>
      <div className="ml-12 mt-2 flex items-center gap-3"><span className="h-2 flex-1 overflow-hidden rounded-full bg-[#202838]"><span className="block h-full rounded-full bg-gradient-to-r from-[#4383ff] to-[#666eff]" style={{ width: `${progress.overall ?? 0}%` }} /></span><span className="text-[11px]">{progress.overall ?? "—"}%</span></div>
      <div className="mt-4 space-y-2.5">{progress.skills.map((skill) => { const done = skill.status === "Completed" || skill.status === "Proficient"; return <div key={skill.skill} className="grid grid-cols-[16px_1fr_88px_18px_92px] items-center gap-2 text-[11px]"><span className={done ? "text-[#50d78a]" : "text-[#71829a]"}>{done ? <Check className="size-4" /> : <Circle className="size-4" />}</span><span className="text-[#c6ccd6]">{locale === "zh" ? zhLabel(skill.skill) : skill.skill}</span><span>{skill.score === null ? "—" : `${skill.score} / ${skill.target}`}</span><span className={done ? "text-[#52da89]" : "text-[#7c8fa7]"}>{done ? <Check className="size-4" /> : <Circle className="size-4" />}</span><span className="text-[#aab2bf]">{locale === "zh" ? zhStatus[skill.status] ?? skill.status : skill.status}</span></div>; })}</div>
    </Panel>
  );
}

type InsightTab = "summary" | "trends" | "gaps" | "analysis";

function InsightsCard({ insight, trends, gaps, locale }: { insight: InsightRecord | null; trends: InsightTrendRow[]; gaps: GapItem[]; locale: "en" | "zh" }) {
  const [tab, setTab] = useState<InsightTab>("summary");
  const positive = trends.filter((row) => row.delta30 > 0).sort((a, b) => b.delta30 - a.delta30);
  const lead = positive[0];
  return (
    <Panel className="bottom-card">
      <div className="flex items-center justify-between"><h2>{locale === "zh" ? "洞察" : "Insights"}</h2><SmallLink href="/insights">{locale === "zh" ? "查看更多" : "View more"}</SmallLink></div>
      <div className="dash-tabs mt-2">{(["summary", "trends", "gaps", "analysis"] as InsightTab[]).map((key) => <button key={key} onClick={() => setTab(key)} className={tab === key ? "active" : ""}>{locale === "zh" ? ({ summary: "摘要", trends: "趋势", gaps: "差距", analysis: "AI 分析" }[key]) : ({ summary: "Summary", trends: "Trends", gaps: "Gaps", analysis: "AI Analysis" }[key])}</button>)}</div>
      {tab === "summary" && <><div className="mt-3 rounded-[10px] bg-[#151a23]"><div className="flex gap-3 p-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#173026] text-[#50d88a]"><ArrowUp className="size-4" /></span><div><div className="text-[12px] font-medium text-white">{locale === "zh" ? "这个月你取得了持续进展。" : "You made solid progress this month."}</div><p className="mt-1 text-[11px] leading-5 text-[#a9b1bf]">{lead ? `${locale === "zh" ? zhLabel(lead.label) : lead.label} ${locale === "zh" ? "近 30 天提升" : "improved by"} ${pct(lead.delta30)}.` : (locale === "zh" ? "继续记录数据以生成趋势。" : "Keep logging data to reveal trends.")}</p></div></div><div className="grid grid-cols-4 border-t border-[#252b35] py-3 text-center">{trends.slice(0, 4).map((row) => <div key={row.metric} className="border-r border-[#262c36] last:border-0"><div className={row.delta30 < 0 ? "text-[#ef766c]" : "text-[#54d88a]"}>{pct(row.delta30)}</div><div className="mt-0.5 truncate px-1 text-[9px] text-[#a1a9b6]">{locale === "zh" ? zhLabel(row.label) : row.label}</div></div>)}</div></div><div className="mt-3 flex items-center gap-3 rounded-[10px] bg-[#151a23] p-3"><span className="flex size-9 items-center justify-center rounded-full bg-[#2c1d3d] text-[#b96cf5]"><Target className="size-4" /></span><div className="flex-1"><div className="text-[10px] text-[#949dac]">{locale === "zh" ? "首要差距" : "Top Gap"}</div><div className="text-[12px] font-medium text-white">{gaps[0]?.skill ?? "—"}</div></div><ChevronRight className="size-4 text-[#b9c0cb]" /></div></>}
      {tab === "trends" && <div className="mt-3 space-y-2 rounded-[10px] bg-[#151a23] p-3">{trends.slice(0, 5).map((row) => <div key={row.metric} className="flex items-center justify-between text-[11px]"><span className="text-[#b3bbc7]">{locale === "zh" ? zhLabel(row.label) : row.label}</span><span className={row.delta30 < 0 ? "text-[#ef766c]" : "text-[#54d88a]"}>{pct(row.delta30)}</span></div>)}</div>}
      {tab === "gaps" && <div className="mt-3 space-y-2 rounded-[10px] bg-[#151a23] p-3">{gaps.slice(0, 4).map((gap) => <div key={gap.rank} className="flex items-start gap-3 text-[11px]"><span className="text-[#b96cf5]">#{gap.rank}</span><div><div className="text-white">{gap.skill} · {gap.gapLabel}</div><div className="text-[#8e98a8]">{gap.note}</div></div></div>)}</div>}
      {tab === "analysis" && <div className="mt-3 rounded-[10px] bg-[#151a23] p-4 text-[11px] leading-5 text-[#a9b1bf]">{insight ? <><p><strong className="text-white">FACT · </strong>{insight.content.fact}</p><p className="mt-2"><strong className="text-white">ACTION · </strong>{insight.content.action}</p></> : (locale === "zh" ? "尚未生成月度 AI 洞察。" : "No monthly AI insight has been generated yet.")}</div>}
    </Panel>
  );
}

export function ReferenceDashboard({ data }: { data: DashboardData }) {
  const { locale, setLocale } = useLocale();
  const [heatFilter, setHeatFilter] = useState<HeatFilter>("all");
  const byDomain = useMemo(() => Object.fromEntries(data.summaries.map((summary) => [summary.domain, summary])), [data.summaries]);
  const workoutRow = data.meVsMe["30D"].rows.find((row) => row.key === "workout");
  const cards = activityCards.map((card) => {
    const domain = card.label === "Study" ? "learning" : card.label === "English" ? "english" : card.label === "Coding" ? "coding" : card.label === "Sleep" ? "health" : null;
    const summary = domain ? byDomain[domain] : null;
    // health today items are Sleep + workout types — a workout item is any
    // health item whose label is not "Sleep".
    const workout = data.today.find(
      (item) => item.domain === "health" && item.metricLabel !== "Sleep"
    );
    return {
      ...card,
      label: locale === "zh" ? ({ Study: "学习", English: "英语", Fitness: "健身", Coding: "编程", Sleep: "睡眠" }[card.label] ?? card.label) : card.label,
      value:
        card.label === "Fitness"
          ? (workout?.valueLabel ?? "—")
          : (summary?.headline ?? card.value),
      change:
        card.label === "Fitness"
          ? workoutRow
            ? pct(workoutRow.deltaPct)
            : card.change
          : summary
            ? pct(summary.deltaPct)
            : card.change,
      bars: summary?.spark.length ? summary.spark.slice(-12).map((value) => {
        const max = Math.max(...summary.spark, 1);
        return Math.max(18, Math.round((value / max) * 100));
      }) : card.bars,
    };
  });
  const progressDelta = Math.round(data.summaries.reduce((sum, item) => sum + item.deltaPct, 0) / Math.max(1, data.summaries.length));

  return (
    <div className="life-dashboard">
      <header className="dashboard-topbar">
        <div>
          <h1>{locale === "zh" ? ({ "Good morning,": "早上好，", "Good afternoon,": "下午好，", "Good evening,": "晚上好，" }[data.header.greeting] ?? data.header.greeting) : data.header.greeting}</h1>
          <p>{locale === "zh" ? ({ ahead: "你已经超过了 90 天前的自己。", below: "你目前低于 90 天前的基准。", steady: "你与 90 天前的自己基本持平。" }[data.header.state]) : data.header.line}</p>
          {data.header.top && Math.abs(data.header.top.deltaPct) > 0 && (
            <p className="mt-1 text-[12px] text-[#8d96a6]">
              {locale === "zh"
                ? `${({ Learning: "学习", English: "英语", Coding: "编程", Health: "健康", Productivity: "效率" }[data.header.top.label as "Learning"] ?? data.header.top.label)}近 90 天${data.header.top.deltaPct > 0 ? "提升" : "变化"} ${Math.abs(Math.round(data.header.top.deltaPct))}%，是你最明显的趋势。`
                : `${data.header.top.label} moved ${data.header.top.deltaPct > 0 ? "+" : ""}${Math.round(data.header.top.deltaPct)}% over 90 days — your clearest trend.`}
            </p>
          )}
        </div>
        <div className="dashboard-date-controls flex items-center gap-4 text-[12px] text-white"><span>{locale === "zh" ? formatDateLongZh(todayKey()) : data.header.dateLabel}</span><ChevronLeft className="size-4 text-[#7e8796]" /><ChevronRight className="size-4 text-[#525b69]" /><Sun className="size-[18px] text-[#f0b84b]" /><button onClick={() => setLocale(locale === "en" ? "zh" : "en")} className="language-toggle" aria-label={locale === "en" ? "切换到中文" : "Switch to English"}><span className={locale === "en" ? "active" : ""}>EN</span><span className={locale === "zh" ? "active" : ""}>中</span></button></div>
        <div className="hidden self-stretch py-1 xl:block"><div className="flex items-start justify-end gap-4"><Search className="mt-2 size-5 text-[#d3d8e0]" /><div className="flex items-start gap-3"><span className="size-8 rounded-full bg-[radial-gradient(circle_at_55%_40%,#7e8d86_0_25%,#574934_28%_55%,#202a30_58%)]" /><span className="text-[11px] leading-4 text-[#9098a6]">{locale === "zh" ? <>打造你想要的<br />人生。</> : <>Build the life<br />you want.</>}</span></div></div><div className="mt-3 rounded-[10px] bg-[#121821] px-5 py-4 text-[11px] leading-5 text-[#9ea7b5]">{locale === "zh" ? <>每天进步一点点&nbsp; —<br />终会积少成多。</> : <>A little progress each day&nbsp; —<br />adds up to big results.</>}</div></div>
      </header>
      <div className="top-metrics-grid">
        <Panel className="progress-card"><div className="flex items-center gap-2 text-[13px] text-white">{locale === "zh" ? "进度指数" : "Progress Index"} <Info className="size-3.5 text-[#828b9a]" /></div><div className="mt-3 flex items-start gap-4"><span className="text-[55px] font-semibold leading-none tracking-[-0.045em] text-white">{data.progress.overall ?? "—"}</span><div><span className={`flex items-center gap-1 text-[15px] ${progressDelta < 0 ? "text-[#ef766c]" : "text-[#52dc8a]"}`}><ArrowUp className="size-4" />{progressDelta > 0 ? "+" : ""}{progressDelta}%</span><span className="mt-1 block text-[11px] text-[#919aaa]">{locale === "zh" ? "对比 90 天前" : "vs. 90 days ago"}</span></div></div><svg className="absolute bottom-3 left-6 h-14 w-[calc(100%-48px)]" viewBox="0 0 280 56" preserveAspectRatio="none" aria-hidden><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5868ff" stopOpacity=".35"/><stop offset="1" stopColor="#5868ff" stopOpacity="0"/></linearGradient></defs><path d="M0 46 L35 38 L60 32 L77 34 L101 26 L124 29 L150 19 L172 21 L191 15 L218 5 L242 -9 L280 -24 L280 56 L0 56Z" fill="url(#area)"/><path d="M0 46 L35 38 L60 32 L77 34 L101 26 L124 29 L150 19 L172 21 L191 15 L218 5 L242 -9 L280 -24" fill="none" stroke="#6570ff" strokeWidth="2"/></svg></Panel>
        {cards.map((card) => <ActivityCard key={card.label} card={card} />)}
      </div>
      <div className="middle-grid">
        <Panel className="contribution-card"><div className="flex items-center justify-between"><div className="flex items-center gap-4"><h2 className="text-[18px] font-semibold text-white">{locale === "zh" ? "贡献记录" : "Contribution"}</h2><div className="dash-tabs">{(["all", "learning", "english", "coding", "productivity"] as HeatFilter[]).map((key) => <button key={key} onClick={() => setHeatFilter(key)} className={heatFilter === key ? "active" : ""}>{locale === "zh" ? ({ all: "全部", learning: "学习", english: "英语", coding: "编程", productivity: "效率" }[key]) : ({ all: "All", learning: "Study", english: "English", coding: "Coding", productivity: "Career" }[key])}</button>)}</div></div><div className="flex items-center gap-3 text-[12px]"><ChevronLeft className="size-4" /><span className="rounded-[8px] border border-[#29313d] px-4 py-1.5">2026</span><ChevronRight className="size-4" /></div></div><Heatmap days={data.heatmap.days} stats={data.heatmapStats} filter={heatFilter} gridStart={data.heatmap.gridStart} locale={locale} /></Panel>
        <TodayCard items={data.today} completion={data.todayCompletion} action={data.nextAction} locale={locale} />
      </div>
      <div className="bottom-grid"><MeVsMe windows={data.meVsMe} locale={locale} /><GoalsCard progress={data.progress} locale={locale} /><InsightsCard insight={data.insight} trends={data.trends} gaps={data.gaps} locale={locale} /></div>
    </div>
  );
}
