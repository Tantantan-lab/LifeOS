/**
 * Site-wide zh dictionary. Components receive `locale` from useLocale()
 * and call t(locale, en) — every user-facing English string should have
 * an entry here so the zh mode is grep-able in one file, not scattered
 * ternaries. Unlisted strings render as English (a visible TODO, never
 * a silent miss).
 */

export type Locale = "en" | "zh";

const ZH: Record<string, string> = {
  // ---- navigation / page headers ----
  Home: "首页",
  Today: "今天",
  Contribution: "贡献记录",
  "Me vs Me": "今昔对比",
  Goals: "目标",
  Insights: "洞察",
  "Data Sources": "数据源",
  Settings: "设置",

  // ---- heatmap facets ----
  All: "全部",
  Overall: "全部",
  Reading: "阅读",
  English: "英语",
  Coding: "编程",
  Productivity: "效率",
  Fitness: "健身",
  min: "分钟",
  words: "词",
  commits: "次提交",
  tasks: "项任务",
  sessions: "次",
  "120 min/day": "每天120分钟",
  "30 min/day (soft)": "每天30分钟（软目标）",
  "6.5–7.5h band": "6.5–7.5小时区间",
  "40 words/day": "每天40词",
  "10 commits/week": "每周10次提交",
  "15 tasks/week": "每周15项任务",
  "3 sessions/week": "每周3次训练",

  // ---- heatmap legend / tooltip / day detail ----
  Less: "少",
  More: "多",
  "Intensity = % of that day's goal · capped at 100%":
    "强度 = 当日目标完成率 · 100% 封顶",
  "4-domain average": "四域平均",
  "reading · english · coding · productivity": "阅读 · 英语 · 编程 · 效率",
  " · 0.95 confidence": " · 置信度 0.95",
  "Daily Goal:": "当日目标：",
  Workouts: "训练",
  "Workout details": "训练详情",
  "Top weights: ": "最大重量：",
  "Streak through this day": "截至当日的连续天数",
  "day": "天",
  days: "天",

  // ---- contribution page ----
  " — completion against your goals, not raw volume.":
    "——相对你目标的完成率，而非原始量。",
  "Active days": "活跃天数",
  "of last 90 days": "近90天",
  "Current streak": "连续天数",
  "Longest streak": "最长连续",
  "Avg completion": "平均完成率",
  "last 90 days": "近90天",
  "By domain": "按领域",
  "How intensity works": "强度如何计算",
  "Intensity is completion against your daily goal — not raw volume.":
    "强度 = 当日目标完成率——不是原始投入量。",
  "Capped at 100%: studying 16h is never darker than 8h.":
    "100% 封顶：学习 16 小时不会比 8 小时颜色更深。",
  "Coding, productivity and fitness compare the day's value to their weekly goals.":
    "编程、效率与训练按当天数值对比周目标。",
  "Health is excluded: sleep targets a band, not a floor.":
    "健康域不参与：睡眠目标是区间，不是下限。",

  // ---- me vs me ----
  "Your only benchmark is your past. The rest of the world just sets the coordinates.":
    "你唯一的基准是过去的自己。世界只负责提供坐标。",
  Domain: "领域",
  Then: "此前",
  Now: "现在",
  Change: "变化",
  Trend: "趋势",
  "NOW:": "现在：",
  "· THEN:": "· 此前：",
  "Weekly totals · dashed line = THEN average": "每周合计 · 虚线 = 此前均值",
  Beginning: "最初",
  Improving: "改善",
  Stable: "持平",
  Declining: "下降",
  "Below baseline": "低于基线",
  "Above baseline": "高于基线",

  // ---- metric labels ----
  "Study time": "学习时长",
  "Words reviewed": "复习单词",
  "Vocabulary time": "词汇时长",
  "Workout time": "训练时长",
  Sleep: "睡眠",
  "Tasks completed": "完成任务",
  Video: "视频",
  Vocabulary: "词汇",
  Listening: "听力",
  Speaking: "口语",
  "IELTS mock": "雅思模考",
  Commits: "提交",
  "Focus time": "专注时长",
  "/day": "/天",
  "/night": "/晚",
  total: "合计",

  // ---- goals ----
  "Daily and weekly targets, benchmark position, and the gap to close.":
    "每日与每周目标、基准位置、以及与目标的差距。",
  Learning: "学习",
  Health: "健康",
  "Target:": "目标：",
  "of target": "目标完成",
  "Benchmark ·": "基准 ·",
  "Your position against the target role. Others only set the coordinates.":
    "你相对目标角色的位置。他人只提供坐标。",
  You: "你",
  Target: "目标",
  "Not assessed": "未评估",
  Met: "已达标",
  "Gap": "差距",
  "What to close next, ordered by distance to target.":
    "下一步要补的差距，按距目标的远近排序。",
  "Not assessed yet": "尚未评估",
  "Level": "等级",
  ready: "就绪",
  "days of evidence": "天证据",
  "Progress against your target — not a score of your life.":
    "相对目标的进度——不是对你人生的打分。",
  "Self-assess or connect a data source to establish a baseline.":
    "自我评估或接入数据源，以建立基线。",
  "Pick a first certification or project to establish a baseline.":
    "选择第一门认证或项目，以建立基线。",

  // ---- insights ----
  "Evidence-backed observations — never judgments.": "基于证据的观察——从不评判。",
  Summary: "概览",
  Trends: "趋势",
  Gaps: "差距",
  "AI Analysis": "AI 分析",
  "What the data says.": "数据说了什么。",
  "Direction over 30/90 days.": "近 30/90 天的方向。",
  "Distance to your own goals.": "与你自己的目标的距离。",
  "One concrete next step.": "一个具体的下一步。",
  "30 days": "30 天",
  "90 days": "90 天",
  Data: "数据",
  "real data": "真实数据",
  "sample history": "样例历史",
  "no data yet": "暂无数据",
  "Weekly": "周度",
  Monthly: "月度",
  generated: "生成于",

  // ---- data sources ----
  "Every source normalizes into the unified Event stream — private by default, credentials never touch the database.":
    "所有数据源统一汇入 Event 流——默认私有，凭据永不落入数据库。",
  "Connector credentials live in":
    "连接器凭据存放在",
  "Fill a token, then run":
    "填入 token，然后运行",
  "each source syncs independently and reports its own status.":
    "——每个数据源独立同步，并各自报告状态。",
  Connectors: "连接器",
  "Mock provenance": "样例来源",
  Connected: "已连接",
  Disconnected: "未连接",
  "Last sync:": "上次同步：",
  never: "从未",
  "events · last 30 days": "条事件 · 近30天",
  "Add the token to apps/api/.env, then run `npm run sync`.":
    "在 apps/api/.env 填入 token，然后运行 `npm run sync`。",
  "Seeded demo history — replaced as real data arrives.":
    "种子演示历史——真实数据到达后会被替换。",

  // ---- today / next best action ----
  "No entries yet": "今天还没有记录",
  "Next Best Action": "下一步行动",
  "Why now?": "为什么现在？",
  "Logging…": "记录中…",
  "Complete & log": "完成并记录",
  "Cancel session": "取消计时",
  "Daily Goal completion": "当日目标完成度",

  // ---- settings ----
  "Goals, targets, connector credentials, timezone.": "目标、指标、连接器凭据、时区。",
  "Planned ·": "计划中 ·",
  "Per-domain daily and weekly targets": "各域的每日与每周目标",
  "Benchmark target selection (e.g. Overseas Engineer)":
    "基准目标选择（如海外工程师）",
  "Data export and deletion": "数据导出与删除",
};

export function t(locale: Locale, en: string): string {
  if (locale !== "zh") return en;
  return ZH[en] ?? en;
}

/** Skill-status words ("Learning") clash with the Learning domain label —
 *  they get their own table. */
const STATUS_ZH: Record<string, string> = {
  "Not started": "未开始",
  Completed: "已完成",
  Proficient: "熟练",
  Learning: "学习中",
};

export function tStatus(locale: Locale, status: string): string {
  if (locale !== "zh") return status;
  return STATUS_ZH[status] ?? status;
}

/** Converts selector-formatted value labels ("1h 59m", "10 words") to zh. */
export function zhValue(label: string): string {
  return label
    .replace(/^(\d+)h (\d+)m \/day$/, "$1小时$2分钟/天")
    .replace(/^(\d+)h \/day$/, "$1小时/天")
    .replace(/^(\d+)m \/night$/, "$1分钟/晚")
    .replace(/^(\d+)h (\d+)m \/night$/, "$1小时$2分钟/晚")
    .replace(/^(\d+) words \/day$/, "$1 词/天")
    .replace(/^(\d+(?:\.\d+)?) words \/day$/, "$1 词/天")
    .replace(/^(\d+)h (\d+)m$/, "$1小时$2分钟")
    .replace(/^(\d+)h$/, "$1小时")
    .replace(/^(\d+(?:\.\d+)?)h$/, "$1小时")
    .replace(/^(\d+)m$/, "$1分钟")
    .replace(/^(\d+) words$/, "$1 词")
    .replace(/^(\d+) commits?$/, "$1 次提交")
    .replace(/^(\d+) tasks?$/, "$1 项任务")
    .replace(/^Band (\S+)$/, "模考 $1")
    .replace(/^(\d+) sessions?$/, "$1 次")
    .replace(/^\+(\d+) min$/, "+$1 分钟");
}

/** "Sep 19" → "9月19日" — compact zh date for captions. */
export function monthDayZh(key: string): string {
  const m = Number(key.slice(5, 7));
  const d = Number(key.slice(8, 10));
  return `${m}月${d}日`;
}
