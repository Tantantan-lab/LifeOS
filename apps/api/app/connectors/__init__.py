"""Connector registry — `npm run sync` iterates this list.

Each connector must implement the Connector protocol (base.py) and be
added here. A failing connector is reported and skipped; one dead token
never blocks the others.
"""

from .base import Connector
from .github import GithubConnector
from .maimemo import MaimemoConnector
from .ticktick import TicktickConnector
from .weread import WereadConnector

REGISTRY: dict[str, type[Connector]] = {
    "github": GithubConnector,
    "weread": WereadConnector,
    "maimemo": MaimemoConnector,
    "ticktick": TicktickConnector,
}


def make_connectors(names: list[str]) -> list[Connector]:
    if names == ["all"]:
        return [cls() for cls in REGISTRY.values()]
    return [REGISTRY[n]() for n in names]
