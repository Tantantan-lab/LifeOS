"""asyncpg pool + the write path for connector events.

Idempotency: event_id = conn:{source}:{metric}:{local_date} — upsert on
conflict. The partial unique index (002_taxonomy.sql) enforces the
one-row-per-(user, domain, metric, day, source) invariant for connector
rows; mock rows (event_id without the conn: prefix) are never touched.
"""

import json
from datetime import date

import asyncpg

from .config import settings
from .models import DailyPoint

_pool: asyncpg.Pool | None = None
_catalog: dict[str, str] | None = None  # metric → domain


async def pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(settings.database_url, min_size=1, max_size=5)
    return _pool


async def owner_id() -> str:
    async with (await pool()).acquire() as con:
        row = await con.fetchrow("select id from users order by created_at asc limit 1")
    if row is None:
        raise RuntimeError("no owner user found — run `npm run seed`")
    return str(row["id"])


async def catalog() -> dict[str, str]:
    """metric → domain, read from the metrics table (single source of truth)."""
    global _catalog
    if _catalog is None:
        async with (await pool()).acquire() as con:
            rows = await con.fetch("select metric, domain from metrics")
        _catalog = {r["metric"]: r["domain"] for r in rows}
    return _catalog


async def upsert_events(points: list[DailyPoint], since: date, until: date) -> int:
    """One transaction per sync run: upsert points + window cleanup + source touch."""
    if not points:
        return 0
    user_id = await owner_id()
    cat = await catalog()

    async with (await pool()).acquire() as con:
        async with con.transaction():
            for p in points:
                expected_domain = cat.get(p.metric)
                if expected_domain is None:
                    raise ValueError(f"unknown metric {p.metric!r} — add it to the catalog")
                if expected_domain != p.domain:
                    raise ValueError(
                        f"metric {p.metric} belongs to {expected_domain}, got {p.domain}"
                    )
                event_id = f"conn:{p.source}:{p.metric}:{p.local_date.isoformat()}"
                timestamp = f"{p.local_date.isoformat()}T{p.default_hour}:00+08:00"
                await con.execute(
                    """
                    insert into events
                      (event_id, user_id, timestamp, domain, metric, value, unit,
                       source, confidence, metadata)
                    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
                    on conflict (event_id) do update set
                      value = excluded.value,
                      confidence = excluded.confidence,
                      metadata = excluded.metadata,
                      timestamp = excluded.timestamp
                    """,
                    event_id, user_id, timestamp, p.domain, p.metric, p.value,
                    p.unit, p.source, p.confidence, json.dumps(p.metadata),
                )

            # Window cleanup: connector rows in [since, until] that were not
            # part of this run's key set (a day the source now reports zero).
            keys = [
                f"conn:{p.source}:{p.metric}:{p.local_date.isoformat()}" for p in points
            ]
            await con.execute(
                """
                delete from events
                 where user_id = $1 and source = $2
                   and local_date between $3 and $4
                   and event_id <> all($5::text[])
                """,
                user_id, points[0].source, since.isoformat(), until.isoformat(), keys,
            )

            # data_sources touch (non-secret metadata only)
            await con.execute(
                """
                insert into data_sources (user_id, source, label, enabled, connected, last_sync_at)
                values ($1, $2, $2, true, true, now())
                on conflict (user_id, source) do update set
                  connected = true, last_sync_at = now()
                """,
                user_id, points[0].source,
            )
    return len(points)
