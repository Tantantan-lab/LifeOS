# LifeOS API

Connector engine + AI insights (FastAPI). The web app keeps reading Postgres
directly — this service owns **writes** (connector sync) and **generation**
(AI insights). Bound to 127.0.0.1:8000 by compose, like everything else.

## Credentials

Copy `.env.example` to `.env` and fill the tokens. Tokens live ONLY in
`.env` (gitignored) + TickTick's `.tokens.json` — never in the database.

| Source | How to get the token |
|---|---|
| GitHub | Personal Access Token (repo read scope) |
| WeRead | https://weread.qq.com/r/weread-skills — scan QR, create a `wrk-` key |
| Maimemo | App: 墨墨背单词 → 开放API → copy token (7-day expiry) |
| TickTick | Developer app (dida365 developer platform), then `npm run ticktick:auth` |
| LLM (DeepSeek) | platform.deepseek.com → API key |

## Commands (from repo root)

```bash
npm run api:up        # build + start the api container
npm run api:logs      # follow logs
npm run sync          # sync every connector (all)
npm run sync:github   # one connector
npm run sync:dry      # print what WOULD be written (no DB writes)
npm run test:api      # pytest (fixture-driven, no tokens needed)
npm run insights      # generate the weekly insight (needs LLM_API_KEY)
```

Host development (no Docker):

```bash
cd apps/api
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

## Design notes

- **Idempotency**: connector rows use `event_id = conn:{source}:{metric}:{date}`
  and upsert on conflict; the partial unique index enforces one row per
  (user, domain, metric, day, source). Re-seeding mock data never touches
  connector rows (mock rows are the non-`conn:` event_ids).
- **Normalization**: every connector emits `DailyPoint`s (one per
  domain+metric+day); `db.upsert_events` validates against the metrics
  catalog and derives `local_date`/`local_time` via the DB trigger.
- **GitHub seam**: `/user/events` covers ~30 days / 300 events — anything
  older stays mock history by design.
- **TickTick seam**: the official Open API has no focus-time endpoint, so
  productivity uses completed tasks/day; `productivity.focus.minutes` is
  reserved.
