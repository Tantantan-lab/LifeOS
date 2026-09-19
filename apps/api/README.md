# LifeOS API

Python backend. Not built yet — arrives in **M3**.

- **Framework**: FastAPI + Pydantic
- **Role**: data cleaning, trend/stat computation, connector sync jobs, AI insight generation
- **Contract**: serves the DTOs currently defined in `apps/web/src/data/selectors.ts` (`/api/dashboard`, `/api/events`, `/api/progress`, `/api/heatmap`, `/api/compare`, `/api/goals`, `/api/insights`)
- **Swap seam**: M3 replaces the bodies of the selectors in `apps/web/src/data/selectors.ts` with `fetch()` calls — components stay untouched.
