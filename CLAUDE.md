# LifeOS — 开发规范

个人生活数据分析产品（"Compete with your past. Benchmark against the world." / "No judgment. Just evidence."）。技术栈已锁定：**Next.js 16（TS）/ FastAPI / plain PostgreSQL**（Docker，sub2api 式轻量单容器风格）。**不要引入 Supabase/重依赖**。

## 架构速览

- `apps/web` — Next.js 前端（**只读** Postgres，无 HTTP 跳板），生产部署走 Docker multi-stage standalone 构建
- `apps/api` — FastAPI 连接器引擎（**只写**：sync + insights），容器内运行
- `database/migrations/*.sql` — 迁移，`npm run db:migrate` 按文件名顺序应用
- `apps/web/src/data/` — 真实数据层（selectors/constants/types/db）；mock 种子生成器在 `apps/web/scripts/`（generator.ts/rng.ts，仅 seed 用）
- `docs/` — architecture / data-model / design-system / master-ui-prompt

## 常用命令

```bash
npm run db:up / db:down          # 仅数据库
npm run db:migrate               # ⚠️ 必须在仓库根跑（npm scripts 从 shell cwd 就近解析）
npm run seed                     # mock 种子（一次）
npm run sync                     # 全量同步（= docker compose exec api python -m app.sync --source all）
docker compose exec api python -m app.sync --source xunji --since 2023-01-01
npm run test:api                 # API 测试
npm run insights                 # 生成 AI 洞察（手动）
npm run typecheck
npm run dev
```

同步是**自动的**：API lifespan 内 asyncio 循环（启动 30s 后首跑，之后每 `SYNC_INTERVAL_MINUTES`=180 分钟；0 关闭）。web 事件索引单层 **60s TTL** —— sync 落库后 ≤1 分钟 UI 自动可见，**无需重启 web**。

## 不可妥协的规则

1. **组件只从 `src/data/selectors.ts` 取数**，不直接碰 db/generator。
2. **数据层零 `Math.random`/`new Date()`**（缓存控制的时间戳除外）——确定性渲染。
3. **趋势色 ≠ 域色**：变化指示只用 trend 三色；域色只表达身份。
4. **Heatmap 强度 = 目标完成率，100% 封顶**；百分比 delta 封顶 ±999%，基线可忽略时按新数据处理（+100%）。
5. **无评判语气**：禁词 bad/fail/poor/worst/missed（lib/copy.ts 集中管理，可 grep）。
6. **所有颜色走 `styles/tokens.css`**，不得裸 hex/裸 Tailwind 语义色。
7. **zh/en 文案**：英文在 lib/copy.ts + 各组件，中文全部在 `lib/i18n.ts` 一个字典里（`t(locale, en)`），未收录的中文会原样显示英文（可见 TODO）。
8. **隐私默认**：真实密钥只在 `apps/api/.env`（gitignored），绝不入库/入 git。

## 验证方法

无 chromium-cli、harness 无法渲染图片。UI 验证用 **CDP 套件** `apps/web/scripts/cdp-check.cjs`（Chrome headless 9222，从 apps/web 目录跑 `node scripts/cdp-check.cjs`）：
- Runtime.evaluate 断言样式/几何/交互 + Log.enable 抓 console 错误
- zh 模式断言：点 `.language-toggle` 切中文 → 断言 → 切回
- 未来日期格（trailing-7 会泄漏）、折线 bbox、爆炸百分比等回归项都在套件里

## 踩过的坑（不要再犯）

- **web 镜像构建前必须 `rm -rf apps/web/.next`**（Dockerfile 已内置）：上一构建层的 .next 会毒化 next build 增量缓存，产出漏编模块的镜像。
- **node-postgres 把 date 列解析成 Date 对象**：按 "YYYY-MM-DD" 字符串查 Map 前必须 `local_date::text`。
- `daysBetween(a, b) = b − a` —— 判断"未来"用 `> 0`。
- 长桥 CLI 只有 macOS 版，容器内跑不了（该数据源已废弃：向内求，不做投资域）。
- 主机 crontab 已有五福交易任务，别动它们。

## Git

远程 `origin` = https://github.com/Tantantan-lab/LifeOS（**private**，gh 账号 Tantantan-lab）。开发分支 `m2-database`，推送 `git push origin m2-database`。提交信息格式：`LifeOS: <简短摘要>` + 要点列表。
