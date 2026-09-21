# 静态 Demo 部署（GitHub Pages）

公开展示站：**写死的 mock 数据，无数据库、无后端**，走 GitHub Actions 构建静态导出推到 Pages。

URL：`https://tantantan-lab.github.io/LifeOS/`

## Demo 模式开关

- `NEXT_PUBLIC_DEMO_MODE=1`：数据层换成确定性 mock 生成器（365 天，锚定 `MOCK_LAST_DATE`），"今天"固定为数据末日；洞察是真实生成的快照常量；计时器落库降级为 no-op；侧栏显示 "Demo data · not real" 徽标。
- `NEXT_STATIC_EXPORT=1`：`next.config.ts` 切 `output: "export"` + `basePath: "/LifeOS"`。
- 两个标志**只在 Pages 构建时设置**；不设时 Docker/开发路径零变化。

注入面只有 `apps/web/src/data/db.ts`（`getEvents`/`getLatestInsight`/`getLatestInsightMeta`/`getDataSources`/`resolveOwnerUserId` 的 demo 分支，全部在 `connection()` 之前短路）+ `lib/today.ts`。组件仍只读 selectors。

## 静态导出的两个坑（已解决）

1. **Server action**（`log-session.ts`）在 export 下禁止打包：两个调用点用条件动态 import，且环境判断**必须内联在同文件**（NEXT_PUBLIC 逐文件替换，跨模块常量会破坏 DCE）。
2. **`searchParams`**：`/insights` 改为服务端预渲染全量数据 + 客户端 `useSearchParams`（Suspense 包裹）切 tab/period。

## 流程

- `.github/workflows/deploy-pages.yml`：push 到 `main` 或手动触发 → `npm ci` → demo 构建 → upload-pages-artifact → deploy-pages
- Pages 源为 "GitHub Actions"（`gh api -X POST repos/{owner}/{repo}/pages -f build_type=workflow`）
- GitHub Pages 免费档要求仓库 public

## 本地验证

```bash
NEXT_STATIC_EXPORT=1 NEXT_PUBLIC_DEMO_MODE=1 npm run build --workspace apps/web   # 出 apps/web/out
# 本地伺服（GitHub Pages 原生支持 /path → /path.html 的 extensionless 解析；
# 本地用带同款重写的 demo-static-serve.cjs）
node apps/web/scripts/demo-static-serve.cjs        # 伺服 apps/web/out（先 cp -r out /tmp/pages/LifeOS）
node apps/web/scripts/demo-cdp-check.cjs           # CDP 套件（DEMO_BASE 指向静态站）
# 洞察快照与图表数字同源于生成器；改生成器后用：
npx tsx --tsconfig ./tsconfig.json scripts/demo-summary.ts   # 打印快照所需数字
```
