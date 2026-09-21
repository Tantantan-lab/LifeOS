"""TypeSafe System One client (plain httpx — project convention, no SDK).

One batched call: POST {TYPESAFE_BASE_URL}/v1/systemone with
{"state", "model", "questions"} → {"model", "answers", "usage"}.
A Choice answer guarantees `choice` is one of the criteria keys we sent:
Jev selects, it never writes.
"""

import asyncio
from dataclasses import dataclass
from typing import Any

import httpx

from .config import settings

RETRY_STATUS = frozenset({429, 500, 502, 503, 504, 529})
RETRY_DELAYS = (1.0, 2.0)  # 3 attempts total
DEFAULT_TIMEOUT = 60.0


class TypeSafeError(RuntimeError):
    """Base class for every TypeSafe failure."""


class TypeSafeAuthError(TypeSafeError):
    """401/403 — key missing, wrong or revoked. Never retried."""


class TypeSafeRequestError(TypeSafeError):
    """422 or a non-JSON body — our payload is wrong. Never retried."""


class TypeSafeUnavailableError(TypeSafeError):
    """429/5xx/transport failure after every retry."""


@dataclass(frozen=True)
class ChoiceAnswer:
    choice: str
    confidence: float
    probabilities: dict[str, float]


async def _sleep(seconds: float) -> None:
    """Test seam — patched in tests to avoid real waits."""
    await asyncio.sleep(seconds)


def endpoint() -> str:
    return f"{settings.typesafe_base_url.rstrip('/')}/v1/systemone"


async def ask(
    state: Any, questions: dict[str, dict], *, timeout: float = DEFAULT_TIMEOUT
) -> dict:
    """One batched call → the raw response body."""
    if not settings.typesafe_api_key:
        raise ValueError("TYPESAFE_API_KEY is not set — add it to apps/api/.env")

    headers = {"Authorization": f"Bearer {settings.typesafe_api_key}"}
    body = {"state": state, "model": settings.typesafe_model, "questions": questions}
    attempts = len(RETRY_DELAYS) + 1

    async with httpx.AsyncClient(timeout=timeout) as client:
        for attempt in range(1, attempts + 1):
            try:
                r = await client.post(endpoint(), headers=headers, json=body)
            except httpx.HTTPError as exc:
                if attempt == attempts:
                    raise TypeSafeUnavailableError(
                        f"typesafe unreachable after {attempts} attempts: {exc}"
                    ) from exc
                await _sleep(RETRY_DELAYS[attempt - 1])
                continue

            if r.status_code in (401, 403):
                raise TypeSafeAuthError(
                    f"typesafe auth failed ({r.status_code}): {r.text[:300]}"
                )
            if r.status_code == 422:
                raise TypeSafeRequestError(
                    f"typesafe rejected the request (422): {r.text[:300]}"
                )
            if r.status_code in RETRY_STATUS:
                if attempt < attempts:
                    await _sleep(RETRY_DELAYS[attempt - 1])
                    continue
                raise TypeSafeUnavailableError(
                    f"typesafe unavailable after {attempts} attempts "
                    f"({r.status_code}): {r.text[:200]}"
                )
            if r.status_code >= 400:
                raise TypeSafeError(f"typesafe error {r.status_code}: {r.text[:300]}")
            try:
                return r.json()
            except ValueError as exc:
                raise TypeSafeRequestError(
                    f"typesafe returned non-JSON: {r.text[:300]}"
                ) from exc

    raise TypeSafeUnavailableError("typesafe call never ran")  # unreachable


def choice(resp: dict, question_id: str) -> ChoiceAnswer | None:
    """The Choice answer for `question_id`, or None when absent/malformed."""
    answer = (resp.get("answers") or {}).get(question_id)
    if not isinstance(answer, dict) or answer.get("type") != "choice":
        return None
    picked = answer.get("choice")
    if not isinstance(picked, str):
        return None
    return ChoiceAnswer(
        choice=picked,
        confidence=float(answer.get("confidence") or 0.0),
        probabilities=dict(answer.get("probabilities") or {}),
    )
