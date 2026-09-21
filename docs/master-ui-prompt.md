# LifeOS Master UI Prompt（产品规范 v1）

> 用户于 2026-09-20 提供的完整设计规范，可交付 Codex / Claude Code / Cursor /
> Lovable / v0 / Figma AI。使用方式：作为设计规范，按 Design Tokens → Layout →
> Sidebar → KPI → Contribution → Me vs Me → Goals → Insights → Data Sources
> 顺序逐组件实现。本仓库的 `design-system.md` 与 `data-model.md` 是它的工程化实现，
> 两者如有出入，以本仓库代码 + 用户后续决策为准（见文末差异注记）。

## 产品核心理念

> **Compete with your past.** 和过去的自己竞争，用世界作为坐标。
> **No judgment. Just evidence.** 不评价，只提供证据。

LifeOS 不是待办软件，也不是单纯的数据 Dashboard。它是 Personal Operating
System / Personal Data Hub，持续收集学习、英语、健身、编程、睡眠、健康、
营养、财务、职业发展等个人数据，回答三个核心问题：

1. 我做了什么？
2. 相比过去的自己，我发生了什么变化？
3. 为了当前目标，下一步最值得做什么？

不做社交排名，不与其他用户比较，不制造焦虑。世界数据只用于 Goal
Benchmark，而不是用户排名。

## 视觉风格

Minimal · Calm · Data-driven · Engineering · Premium · Dark-first。
参考 Linear × GitHub × Vercel × Apple Health，但不复制任何一个。
极简、克制、工程感、高信息密度而不拥挤、弱阴影、精细边框、大量留白、
数字 > 文字。避免：企业 BI 风、赛博朋克、强烈霓虹、玻璃拟态滥用、大面积
渐变、游戏化金币/奖杯/火焰/徽章。

| Token | 值 |
|---|---|
| Background | `#0B0E14` |
| Sidebar | `#0D1118` |
| Card 一级 | `#11151D` |
| Card 二级 | `#161B25` |
| Hover | `#1A202C` |
| Border | `#242A36` |
| Primary Text | `#F4F6F8` |
| Secondary Text | `#A1A8B3` |
| Muted Text | `#697180` |
| Brand | `#6366F1`（或 `#6C72FF`） |
| Study | `#4F8CFF` |
| English | `#A970FF` |
| Fitness | `#45D483` |
| Coding | `#FF9F43` |
| Sleep | `#7568FF` |
| Improving / Stable / Declining | `#45D483` / `#A1A8B3` / `#F07878` |

Heatmap 从深色逐渐过渡到亮色；红色不用于普通"未完成"，只用于真正值得
注意的下降、风险或异常。

## 字体与数字层级

Geist / Inter / SF Pro。Hero Number 48–64px（w600–700）、Dashboard KPI
28–36px、H1 28–32px、H2 20px、Body 14–16px、Metadata 12–13px。

## Layout

Desktop First，第一天起 Responsive。左侧固定 Sidebar 220–240px；内容最大宽
1440–1600px；页面 padding 24–32px；12 列 grid；卡间距 12–16px。Card：
radius 12–16px、border 1px `#242A36`、bg `#11151D`、padding 20–24px、弱阴影。

## Sidebar

LifeOS 品牌 + "Compete with your past."；导航：Home / Today / Contribution /
Me vs Me / Goals / Insights / Finance / Health / Nutrition / Data Sources；
底部 "No judgment. Just evidence." + 用户 Avatar。当前页高亮 `#1A202C` +
Primary Accent。Lucide 线性图标。

## Dashboard Header

左侧问候语（数据驱动的克制短语，如 "Ahead of your 90-day self."——必须来自
真实指标）；右侧日期（可切换）+ Theme toggle + Search + Avatar。

## 核心指标行

**Goal Progress**（不叫 Life Score，不给人生打分）：72、↑+18% vs 90 days ago、
30/90 天 Sparkline。Progress 必须绑定具体目标（如 Overseas Automation
Engineer 72%），不能暗示"你的人生是72分"。

**领域 KPI Cards**（Study / English / Fitness / Coding / Sleep）：Icon +
名称 + Today Value + Change + 14 天 mini bar chart。颜色按域色。

## Contribution Heatmap（核心组件 #1）

表达"我做过什么"。Filter：All / Study / English / Fitness / Coding /
Career；年份切换；Jan→Dec 横轴、Mon→Sun 纵轴；10–12px 方块、2–3px 圆角。
**颜色 = completion_ratio = min(actual / daily_target, 1)**——100% 封顶，
投入 200% 不变深，不鼓励过度工作。底部：active days / streak / longest
streak + Less→More 图例。点击某天弹 Day Detail（当日各域时长 + Daily Goal %）。

## Today Card

环形进度 78% Daily Goal（当日目标完成率，非"人生完成度"）；右侧各域列表
（完成=彩色 check，未完成=灰 circle）；**Next Best Action**（如 "IELTS
Writing 40 min"），必须带 Reason（如 "writing practice is 21% below your
weekly target"），不能只说"去学习"。

## Me vs Me（核心组件 #2）

表达"我改变了多少"。时间 30D / 90D / 1Y / All；Then → Now + Change 表格。
只比较 Now vs Historical Self——禁止 Top 10%、超过 X% 用户、排行榜、好友
排名。

## Goals / Level（核心组件 #3）

表达"我要去哪里"。目标（Overseas Automation Engineer）+ Level + Goal
Progress 72% + 能力清单（English IELTS 6.0/7.0、Python/Docker/Kubernetes/
Cloud/Overseas CV，各带 Completed / Learning / Not Started 状态）。Goal
Progress 由 Skills / Language / Projects / Experience / Certifications /
Requirements 共同计算，不能凭 AI 主观评分。

## Insights

Tabs：Summary / Trends / Gaps / AI Analysis。AI 输出严格
FACT / TREND / GAP / ACTION；禁止鸡汤（"You are amazing" 等），只使用数据。
Top 1 Gap 可点击进入详细分析。

## Finance

Personal Financial Data Hub。数据源：Alipay / WeChat Pay / Bank / Credit
Card / CSV / Excel，未来 Open Banking。核心是自动收集已有账单而非手动记账。
数据流：Data Sources → Finance Inbox → Normalizer → Deduplication →
Classification → Canonical Transaction → Analytics。必须区分 Merchant /
Payment Channel / Funding Account（如 Starbucks / Alipay / CMB Credit Card
三者不是同一概念）；识别 Expense / Income / Transfer / Credit Card
Repayment / Refund / Investment（信用卡还款不能再次算消费）。Dashboard：
Monthly Spending / Income / Savings / Savings Rate / Recurring / Category /
Cash Flow / Me vs Me。

## Nutrition

数据源 Boohee / Apple Health / HealthKit / Food Scale。今日宏量（Calories /
Protein / Carbs / Fat 实际 vs 目标）+ Meals（Breakfast / Lunch / Dinner /
Snack）+ 7D / 30D / 90D 趋势。

## Health

数据源 Apple Health / Apple Watch / Huawei Health / Health Connect。数据：
Steps / Heart Rate / Sleep / Workout / Weight / Body Fat / Calories /
Nutrition；Today / 7D / 30D / 90D + Me vs Me。

## Data Sources

独立 Connector 页：Apple Health / GitHub / WakaTime / Boohee / WeRead /
Maimemo / Finance Import / Strava / Desktop Collector；每个显示 Connected /
Disconnected / Syncing / Error + Last Sync。

## 统一数据模型

所有 Connector 最终转为 LifeOS Event：

```
{ id, user_id, timestamp, domain, metric, value, unit, source, confidence, metadata }
```

例：`{domain: "nutrition", metric: "protein", value: 126, unit: "g", source: "boohee"}`。

## 交互

Card hover：border 微亮、最多 translateY(-1px)、150–200ms ease。Heatmap：
hover Tooltip + 点击 Day Detail。Chart hover：date / value / change。主要
指标可点击进详情页。支持 Dark/Light，优先 Dark。

## Responsive

Desktop：Sidebar + 12 列。Tablet：Sidebar 收缩为 icon rail。Mobile：
Bottom Navigation；KPI 横向滑动或 2 列；Heatmap 横向滚动；其余 Full Width。

## 技术栈

Next.js + TypeScript + Tailwind + shadcn/ui + Lucide；Recharts；Contribution
用 Custom CSS Grid / SVG；FastAPI + Python + Pydantic；PostgreSQL（可选
Supabase：Auth / PostgreSQL / Storage / Cron / Realtime）。

## 组件结构

AppSidebar · DashboardHeader · MetricCard · ProgressCard · MiniBarChart ·
Sparkline · ContributionHeatmap · ContributionCell · ContributionTooltip ·
TodayProgress · DailyGoalRing · NextBestAction · MeVsMe · ComparisonRow ·
GoalCard · SkillProgress · SkillStatus · InsightsCard · InsightMetric ·
GapCard · FinanceOverview · TransactionList · CashFlowChart ·
NutritionOverview · MacroProgress · HealthOverview · ConnectorCard ·
SyncStatus。

## 产品原则

1. Private by default
2. No judgment
3. Evidence before AI
4. Compare with past self
5. World = benchmark, not ranking
6. AI cannot invent metrics
7. Analytics first, selection last（Raw Events → Analytics Engine → Structured
   Summary → candidate sentences → TypeSafe Choice）

## 最终视觉要求

"一个工程师给自己构建的人生操作系统"——GitHub 的数据感 + Linear 的克制 +
Vercel 的工程感 + Apple Health 的个人健康数据感，形成 LifeOS 品牌语言。
首页视觉层级：Goal Progress → Today → Contribution → Me vs Me → Goals/Gap
→ Insights → Next Best Action。10 秒内回答：今天做了什么 / 相比过去如何 /
距离目标还差什么 / 下一步做什么。

---

## 与当前实现的差异注记（2026-09-20）

- 本仓库已按此规范的 ~85% 落地（M1-M5），工程细节见 design-system.md /
  data-model.md / architecture.md。
- M4 已补齐：Next Best Action（带 Reason）、Heatmap Day Detail 弹窗、
  Dashboard Header（数据驱动问候语）、Today 环形进度、Data Sources 真页面。
- M5 已补齐（Decision Interface 方向）：NBA 提升为首页主卡（Why now +
  Start 计时 → 完成写 manual Event → 闭环重算）、Goals Level 徽章 +
  技能状态词（Completed/Proficient/Learning/Not started）、Insights 四 tab
  （Summary/Trends/Gaps/AI Analysis）、Theme 切换（System/Dark/Light，
  默认 Dark）。
- 尚未实现：Finance 域、Nutrition 域、Health 独立页、heatmap 年份切换
  （当前数据仅一年，跨年后再做）、移动端 bottom nav（现为顶部横滚 pills）。
- 域命名已演进：规范中的 Study/Fitness/Sleep 在 M3 中合并为
  learning / health 域（见 data-model.md 的指标目录）；Finance / Nutrition
  为新域，schema 通过域 CHECK 迁移即可支持。
- 技术栈差异：本仓库使用 plain PostgreSQL（单容器 sub2api 式）而非
  Supabase——Auth/RLS 为多用户商业化时的可选项，见架构决策历史。
