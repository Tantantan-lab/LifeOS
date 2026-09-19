"""Connector protocol."""

from datetime import date
from typing import Protocol

from ..models import DailyPoint


class Connector(Protocol):
    name: str
    label: str
    # How far back the source can realistically report (sync default window).
    default_days: int

    async def fetch(self, since: date, until: date) -> list[DailyPoint]: ...
