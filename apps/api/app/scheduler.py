"""In-process sync scheduler — a plain asyncio loop started from the
FastAPI lifespan.

Keeps the stack self-contained (no host crontab, no extra container):
the first run fires shortly after startup to catch up, then every
SYNC_INTERVAL_MINUTES (0 disables). Runs never overlap — the loop awaits
each run fully before sleeping. A failing run is logged, never raised:
the next tick retries, and per-connector failures already degrade
gracefully inside run_sync.
"""

import asyncio
import logging

from .config import settings
from .sync import run_sync

# uvicorn only configures its own loggers — route lifecycle lines to stdout.
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(message)s")

log = logging.getLogger("lifeos.sync")

INITIAL_DELAY_SECONDS = 30


async def sync_loop() -> None:
    interval = settings.sync_interval_minutes
    if interval <= 0:
        log.info("scheduled sync disabled (SYNC_INTERVAL_MINUTES=%s)", interval)
        return
    await asyncio.sleep(INITIAL_DELAY_SECONDS)
    while True:
        try:
            reports = await run_sync("all")
            ok = sum(1 for r in reports if r.status == "ok")
            log.info("scheduled sync done: %s/%s sources ok", ok, len(reports))
        except Exception:  # noqa: BLE001 — the next tick retries
            log.exception("scheduled sync failed")
        await asyncio.sleep(interval * 60)
