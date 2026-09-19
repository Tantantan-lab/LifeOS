# LifeOS Packages

Shared packages across LifeOS apps. Each subdirectory becomes an npm workspace once it contains a real `package.json` (npm's workspaces glob safely ignores directories without one).

- `ui/` — shared design system, extracted from `apps/web` in **M4**
- `analytics/` — aggregation / trend / gap computation, owns the DTO contracts (**M3**)
- `connectors/` — external data source importers: GitHub, Anki, Apple Health, Hevy (**M4**)
