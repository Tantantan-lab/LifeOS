"""OpenAI-compatible chat client (plain httpx, no SDK).

Provider presets (base URLs are stable; model IDs churn — re-confirm on
the provider page at first use):

    deepseek  https://api.deepseek.com                       deepseek-flash
    qwen      https://dashscope.aliyuncs.com/compatible-mode/v1  qwen-plus
    kimi      https://api.moonshot.cn/v1                     (see platform)
    glm       https://open.bigmodel.cn/api/paas/v4           glm-4.6
"""

import json

import httpx

from .config import settings

PRESETS: dict[str, tuple[str, str]] = {
    "deepseek": ("https://api.deepseek.com", "deepseek-flash"),
    "qwen": ("https://dashscope.aliyuncs.com/compatible-mode/v1", "qwen-plus"),
    "kimi": ("https://api.moonshot.cn/v1", ""),
    "glm": ("https://open.bigmodel.cn/api/paas/v4", "glm-4.6"),
}


def resolve() -> tuple[str, str, str]:
    """→ (base_url, model, provider)."""
    provider = settings.llm_provider
    if provider in PRESETS:
        base, default_model = PRESETS[provider]
        model = settings.llm_model or default_model
        return base, model, provider
    return settings.llm_base_url, settings.llm_model, provider


async def complete_json(system: str, user: str, *, timeout: int = 60) -> dict:
    base_url, model, _ = resolve()
    if not settings.llm_api_key:
        raise ValueError("LLM_API_KEY is not set — add it to apps/api/.env")

    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.post(
            f"{base_url}/chat/completions",
            headers={"Authorization": f"Bearer {settings.llm_api_key}"},
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.3,
                "max_tokens": 900,
            },
        )
        r.raise_for_status()
        content = r.json()["choices"][0]["message"]["content"]
        return json.loads(content)
