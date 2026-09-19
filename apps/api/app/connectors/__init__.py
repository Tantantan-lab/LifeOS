"""Connector registry — `npm run sync` iterates this list.

Each connector must implement the Connector protocol (base.py) and be
added here. A failing connector is reported and skipped; one dead token
never blocks the others.
"""

from .base import Connector
from .github import GithubConnector

REGISTRY: dict[str, type[Connector]] = {
    "github": GithubConnector,
}


def make_connectors(names: list[str]) -> list[Connector]:
    if names == ["all"]:
        return [cls() for cls in REGISTRY.values()]
    return [REGISTRY[n]() for n in names]
