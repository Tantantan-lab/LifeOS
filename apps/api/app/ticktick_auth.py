"""One-time TickTick OAuth2 helper:

    python -m app.ticktick_auth

Prints the authorize URL → you open it in a browser and authorize →
paste the REDIRECTED URL (or the raw `code`) back → the token pair is
exchanged and written to .tokens.json (0600, gitignored). No local
callback server needed — works inside the container.
"""

import asyncio
import sys
from urllib.parse import parse_qs, urlparse

import httpx

from .config import settings
from .connectors.ticktick import _region, _save_tokens


def _authorize_url(oauth_host: str) -> str:
    scope = settings.ticktick_scope.replace(" ", "+")
    return (
        f"{oauth_host}/oauth/authorize"
        f"?scope={scope}"
        f"&client_id={settings.ticktick_client_id}"
        f"&state=lifeos"
        f"&redirect_uri=none"
        f"&response_type=code"
    )


async def _exchange(code: str) -> dict:
    _, oauth_host, _ = _region()
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            f"{oauth_host}/oauth/token",
            auth=(settings.ticktick_client_id, settings.ticktick_client_secret),
            data={"grant_type": "authorization_code", "code": code, "redirect_uri": "none"},
        )
        r.raise_for_status()
        return r.json()


async def main() -> None:
    if not settings.ticktick_client_id or not settings.ticktick_client_secret:
        print(
            "TICKTICK_CLIENT_ID/SECRET are not set — create an app on the "
            "developer platform first (dida365 developer platform for CN).",
            file=sys.stderr,
        )
        raise SystemExit(1)

    _, oauth_host, region = _region()
    print(f"region: {region}")
    print("1. Open this URL and authorize:")
    print(f"\n    {_authorize_url(oauth_host)}\n")
    print("2. After authorizing, the browser lands on an error/blank page.")
    print("   Paste the whole redirected URL (it contains ?code=...) — or just the code:")
    pasted = input("> ").strip()
    if "code=" in pasted:
        pasted = parse_qs(urlparse(pasted).query).get("code", [""])[0]
    if not pasted:
        print("no code found", file=sys.stderr)
        raise SystemExit(1)

    tokens = await _exchange(pasted)
    _save_tokens(
        {
            "access_token": tokens["access_token"],
            "refresh_token": tokens.get("refresh_token", ""),
        }
    )
    print("tokens saved to .tokens.json (0600) — run `npm run sync` to use them")


if __name__ == "__main__":
    asyncio.run(main())
