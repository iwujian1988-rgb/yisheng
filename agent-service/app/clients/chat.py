from __future__ import annotations

import json
import logging
from collections.abc import AsyncIterator
from typing import Any

import httpx

from app.config import Settings, resolve_ai_model
from app.utils.provider_errors import raise_for_provider_response

logger = logging.getLogger(__name__)

_shared_http_client: httpx.AsyncClient | None = None


def get_shared_http_client() -> httpx.AsyncClient:
    global _shared_http_client
    if _shared_http_client is None or _shared_http_client.is_closed:
        _shared_http_client = httpx.AsyncClient(
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10)
        )
    return _shared_http_client


class ChatClient:
    """OpenAI-compatible chat completions client (same contract as Node provider-gateway)."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    @property
    def configured(self) -> bool:
        return self._settings.ai_configured

    def _endpoint(self) -> str:
        if self._settings.ai_chat_completions_url:
            return self._settings.ai_chat_completions_url.rstrip("/")
        base_url = self._settings.effective_ai_base_url
        if base_url:
            return base_url.rstrip("/") + "/v1/chat/completions"
        raise RuntimeError("AI chat completions endpoint is not configured")

    def _apply_provider_controls(self, url: str, payload: dict[str, Any]) -> dict[str, Any]:
        if "api.deepseek.com" in url:
            payload["thinking"] = {
                "type": "enabled" if self._settings.ai_thinking_mode == "enabled" else "disabled"
            }
        return payload

    async def chat_completions(
        self,
        *,
        model: str,
        messages: list[dict[str, str]],
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ) -> str:
        if not self.configured:
            raise RuntimeError("AI provider is not configured (AI_API_KEY and endpoint required)")

        url = self._endpoint()
        payload: dict[str, Any] = self._apply_provider_controls(url, {
            "model": resolve_ai_model(model),
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        })
        headers = {
            "Authorization": f"Bearer {self._settings.effective_ai_api_key}",
            "Content-Type": "application/json",
        }
        timeout = self._settings.ai_timeout_ms / 1000
        client = get_shared_http_client()
        response = await client.post(url, json=payload, headers=headers, timeout=timeout)
        raise_for_provider_response(response)
        data = response.json()

        choices = data.get("choices") or []
        if not choices:
            raise RuntimeError("AI provider returned empty choices")
        message = choices[0].get("message") or {}
        content = message.get("content")
        if not isinstance(content, str):
            raise RuntimeError("AI provider returned non-text content")
        return content

    async def chat_completions_stream(
        self,
        *,
        model: str,
        messages: list[dict[str, str]],
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ) -> AsyncIterator[str]:
        if not self.configured:
            raise RuntimeError("AI provider is not configured (AI_API_KEY and endpoint required)")

        url = self._endpoint()
        payload: dict[str, Any] = self._apply_provider_controls(url, {
            "model": resolve_ai_model(model),
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
        })
        headers = {
            "Authorization": f"Bearer {self._settings.effective_ai_api_key}",
            "Content-Type": "application/json",
        }
        timeout = self._settings.ai_timeout_ms / 1000
        client = get_shared_http_client()
        async with client.stream("POST", url, json=payload, headers=headers, timeout=timeout) as response:
            raise_for_provider_response(response)
            async for line in response.aiter_lines():
                if not line or not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if not data or data == "[DONE]":
                    if data == "[DONE]":
                        break
                    continue
                try:
                    parsed = json.loads(data)
                except json.JSONDecodeError:
                    logger.debug("skip_non_json_stream_chunk")
                    continue
                choices = parsed.get("choices") or []
                if not choices:
                    continue
                delta = choices[0].get("delta") or {}
                content = delta.get("content")
                if isinstance(content, str) and content:
                    yield content
