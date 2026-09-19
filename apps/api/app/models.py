"""Shared data shapes for the connector engine."""

from dataclasses import dataclass, field
from datetime import date
from typing import Any


@dataclass(frozen=True)
class DailyPoint:
    """One normalized daily aggregate — maps 1:1 to a LifeOS event row."""

    local_date: date
    domain: str
    metric: str
    value: float
    unit: str
    source: str
    confidence: float = 0.9
    metadata: dict[str, Any] = field(default_factory=dict)
    # Clock time used for the event timestamp (daily aggregates land at
    # end-of-day so a day's point never bleeds into the next via timezone).
    default_hour: str = "23:00"


@dataclass
class SyncReport:
    source: str
    status: str  # ok | dry | failed
    days: int = 0
    points: int = 0
    upserted: int = 0
    window: str = ""
    error: str = ""


@dataclass
class InsightContent:
    fact: str
    trend: str
    gap: str
    action: str
