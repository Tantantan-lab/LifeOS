"""Connector sync CLI:

    python -m app.sync --source all          # every registered connector
    python -m app.sync --source github       # one connector
    python -m app.sync --dry-run             # print points, write nothing
    python -m app.sync --since 2026-09-01    # window start (default: per-connector)

Runs sequentially; a failing connector is reported and skipped so one
dead token never blocks the others. The same code path backs
POST /api/sync/{source}.
"""

import argparse
import asyncio
from datetime import date, datetime, timedelta, timezone

from . import db
from .connectors import REGISTRY, make_connectors
from .models import SyncReport

SHANGHAI = timezone(timedelta(hours=8))


def _today() -> date:
    return datetime.now(SHANGHAI).date()


async def run_sync(
    source: str,
    since: date | None = None,
    until: date | None = None,
    dry_run: bool = False,
) -> list[SyncReport]:
    until = until or _today()
    reports: list[SyncReport] = []

    for conn in make_connectors([source]):
        window_since = since or (until - timedelta(days=conn.default_days - 1))
        try:
            points = await conn.fetch(window_since, until)
        except Exception as e:  # noqa: BLE001 — one dead token must not block others
            reports.append(
                SyncReport(source=conn.name, status="failed", error=str(e)[:200])
            )
            continue

        report = SyncReport(
            source=conn.name,
            status="dry" if dry_run else "ok",
            days=len({p.local_date for p in points}),
            points=len(points),
            window=f"{window_since.isoformat()}..{until.isoformat()}",
        )
        if dry_run:
            for p in points:
                print(
                    f"  {p.local_date}  {p.domain:<13} {p.metric:<30} "
                    f"{p.value:>8.1f} {p.unit:<8} {p.metadata}"
                )
        else:
            report.upserted = await db.upsert_events(points, window_since, until)
        reports.append(report)

    for r in reports:
        line = f"{r.source:<10} {r.status:<6} days={r.days:<4} points={r.points:<4} {r.window}"
        if r.status == "ok":
            line += f"  upserted={r.upserted}"
        if r.error:
            line += f"  ERROR: {r.error}"
        print(line)
    return reports


def main() -> None:
    parser = argparse.ArgumentParser(description="LifeOS connector sync")
    parser.add_argument("--source", default="all", choices=["all", *REGISTRY.keys()])
    parser.add_argument("--since", help="YYYY-MM-DD window start")
    parser.add_argument("--until", help="YYYY-MM-DD window end")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    since = date.fromisoformat(args.since) if args.since else None
    until = date.fromisoformat(args.until) if args.until else None
    asyncio.run(run_sync(args.source, since, until, args.dry_run))


if __name__ == "__main__":
    main()
