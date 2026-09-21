"""LifeOS API — the connector engine's HTTP surface.

The web app keeps reading Postgres directly (no HTTP hop); this service
owns WRITES (connector sync) and GENERATION (insights). It is bound to
127.0.0.1 by compose like everything else.
"""

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI

from . import db
from .scheduler import sync_loop
from .sync import run_sync


@asynccontextmanager
async def lifespan(_app: FastAPI):
    task = asyncio.create_task(sync_loop())
    try:
        yield
    finally:
        task.cancel()


app = FastAPI(title="LifeOS API", lifespan=lifespan)


@app.get("/healthz")
async def healthz() -> dict:
    try:
        async with (await db.pool()).acquire() as con:
            await con.fetchval("select 1")
        return {"status": "ok", "db": "ok"}
    except Exception:  # noqa: BLE001 — health endpoint must always answer
        return {"status": "degraded", "db": "error"}


@app.get("/api/sources")
async def sources() -> list[dict]:
    user_id = await db.owner_id()
    async with (await db.pool()).acquire() as con:
        rows = await con.fetch(
            "select source, label, enabled, connected, last_sync_at from data_sources"
            " where user_id = $1 order by source",
            user_id,
        )
    return [
        {
            "source": r["source"],
            "label": r["label"],
            "enabled": r["enabled"],
            "connected": r["connected"],
            "last_sync_at": r["last_sync_at"].isoformat() if r["last_sync_at"] else None,
        }
        for r in rows
    ]


@app.post("/api/sync/{source}")
async def sync(source: str) -> dict:
    reports = await run_sync(source)
    return {
        "reports": [
            {k: v for k, v in r.__dict__.items()} for r in reports
        ]
    }
