# LifeOS

> **Compete with your past. Benchmark against the world.**
> 和过去的自己竞争，用世界作为坐标。
>
> **No judgment. Just evidence.**
> 不评价，只提供证据。

[![Demo](https://img.shields.io/badge/demo-live-4f46e5?logo=github)](https://tantantan-lab.github.io/LifeOS/)
[![GitHub Pages](https://img.shields.io/badge/pages-static%20demo-22272e?logo=githubpages)](https://tantantan-lab.github.io/LifeOS/)

## 中文介绍

LifeOS 是一个个人生活数据仪表盘，把真实的日常活动（学习、英语、健身、编程、睡眠……）汇聚成一条证据流，回答三个问题：

1. **我做了什么？** —— 贡献热力图（365 天，强度按当天值计）
2. **我变了多少？** —— 今昔对比（30 天 / 90 天 / 1 年 / 最初）
3. **下一步去哪？** —— 目标差距 → 下一步行动（带计时器的决策闭环）

**在线演示 → [tantantan-lab.github.io/LifeOS](https://tantantan-lab.github.io/LifeOS/)**（支持中英文、明暗主题。演示站使用写死的确定性 mock 数据，侧栏标注 "Demo data · not real"——你的真实数据永不出本机。）

核心亮点：

- **365 天热力图**：强度 = 目标完成率，100% 封顶；周目标格子测当天本身（休息日就是空格）
- **五大域一条事件流**：学习 / 英语 / 编程 / 健康 / 效率，官方接口（GitHub、微信读书、墨墨、滴答、训记）+ 手动记录
- **洞察是「选择」出来的，不是「生成」的**：代码用你的数字渲染候选句，TypeSafe 的 Jev 模型每题选一句——数字不可能被编造，评判性词汇不可能出现，中英双语
- **目标与就绪度**：只和自己比（海外工程师基准），绝无百分位排名
- **隐私默认**：单用户、数据库只绑本机、密钥只在服务端

---

A personal life-data dashboard that aggregates your real activity — study, English, fitness, coding, sleep — into one evidence stream, and answers three questions:

1. **What have I done?** — Contribution heatmap (365 days, day-value semantics)
2. **How much have I changed?** — Me vs Me windows (30D / 90D / 1Y / Beginning)
3. **Where do I go next?** — Goal gap → Next Best Action with a session timer loop

## Demo

**→ [tantantan-lab.github.io/LifeOS](https://tantantan-lab.github.io/LifeOS/)** (English / 中文, dark / light)

The public demo runs on a **static snapshot of deterministic mock data** — no database, no backend — and badges itself as "Demo data · not real" in the sidebar. Your real data never leaves your machine.

| Home — heatmap, activity cards, goal ring | AI Analysis — TypeSafe-selected insights, en/zh |
|---|---|
| ![Home dashboard](docs/screenshots/home-dark.png) | ![AI Analysis](docs/screenshots/insights-analysis.png) |

## Highlights

- **365-day contribution heatmap** — intensity = goal completion capped at 100%; weekly-goal cells measure the day itself (a rest day renders empty)
- **Five domains, one event stream** — learning / english / coding / health / productivity, merged from official connectors (GitHub, WeRead, Maimemo, TickTick, Xunji) and manual logging
- **Insights that are selected, not generated** — code renders candidate sentences from your numbers; a TypeSafe System One model (Jev) picks one per section. Numbers can't be hallucinated; judgment words can't appear. Fully bilingual (en/zh)
- **Goals & readiness** — you vs. your own target (Overseas Engineer benchmark), never a percentile or a ranking
- **Decision loop** — Next Best Action with evidence ("Why now?"), a session timer, and manual event logging that feeds the loop
- **Privacy by default** — single-user, localhost-bound Postgres, server-only credentials

## Tech stack

Next.js 16 (TypeScript, Tailwind v4) · FastAPI · plain PostgreSQL (one Docker container, sub2api-style) · TypeSafe (Jev) · headless-Chrome CDP UI test suite

## Getting started

**Container mode (one command):**

```bash
npm run up          # build + start web + api + db in Docker (http://localhost:3000)
npm run seed        # first time: seed owner + 365-day history (idempotent)
```

**Dev mode (hot reload, DB in container only):**

```bash
npm install
npm run db:up       # start the postgres container
npm run db:migrate  # apply schema
npm run seed        # seed owner + history
npm run dev         # dev server with hot reload
```

**Useful scripts**

```bash
npm run sync            # sync every connector (needs credentials in apps/api/.env)
npm run insights        # generate the weekly insight (needs TYPESAFE_API_KEY)
npm run test:api        # pytest for the api (fixture-driven, no tokens needed)
npm run typecheck       # tsc --noEmit
npm run db:reset        # wipe + recreate + migrate + re-seed (destructive)
```

## Layout

```
compose.yaml        dev database — ONE postgres:17 container, 127.0.0.1:5432,
                    data bind-mounted at .data/postgres (sub2api-style)
apps/web            Next.js 16 + TypeScript + Tailwind v4
apps/web/scripts    migrate.ts + seed.ts + CDP UI suite + static-demo helpers
apps/api            FastAPI — connector engine + TypeSafe insights
database/migrations PostgreSQL DDL
docs                architecture / design system / data model / demo deploy
```

## Status

- **M1 (done)**: UI — Home, Contribution, Me vs Me, Goals + design system.
- **M2 (done)**: database — one plain Postgres container: users/events/goals/metrics/data_sources, seeded 365-day history, read path switched to the DB.
- **M3 (done)**: five-domain taxonomy, connector engine (GitHub + WeRead + Maimemo + TickTick — official APIs), insights pipeline (analytics summary → TypeSafe Choice (Jev) → FACT/TREND/GAP/ACTION), real "today".
- **M4 (done)**: interaction gaps — Next Best Action (with reason), Heatmap Day Detail, Dashboard Header, Daily Goal ring, Data Sources page.
- **M5 (done)**: Decision Interface — NBA main card with Start timer → manual Event → loop re-derivation; Level badge + skill statuses; Insights 4-tab; theme switch.
- **M6 (next)**: Finance / Nutrition domains, Health page, more connectors.
