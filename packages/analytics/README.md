# @lifeos/analytics

Analytics / progress engine. Arrives in **M3** (Python FastAPI, `apps/api`), possibly mirrored as a TS package for client-side reuse.

Responsibilities:
- Period aggregations (7D / 30D / 90D / 365D)
- Trend classification (improving / stable / declining, ±3% dead zone)
- Goal completion (capped at 100%)
- Gap computation for benchmarks
- The structured summary JSON fed to the LLM (FACT / TREND / GAP / ACTION)

Owns the DTO contracts currently defined in `apps/web/src/data/types.ts`.
