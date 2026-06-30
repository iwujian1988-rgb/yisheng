from __future__ import annotations

import logging
import re
from typing import Any

import httpx

from app.config import Settings
from app.utils.provider_errors import raise_for_provider_response

logger = logging.getLogger(__name__)


def _normalize_text(value: str) -> str:
    return value.replace("\r\n", "\n").replace("\r", "\n").strip()


def _strip_code_fence(text: str) -> str:
    value = text.strip()
    match = re.match(r"^```(?:json|text)?\s*([\s\S]*?)```$", value)
    return match.group(1).strip() if match else value


def _resolve_image_mime(mime_type: str, file_type: str) -> str:
    if mime_type:
        return mime_type
    ext = file_type.lower()
    if ext == "png":
        return "image/png"
    if ext == "webp":
        return "image/webp"
    if ext == "gif":
        return "image/gif"
    if ext == "bmp":
        return "image/bmp"
    return "image/jpeg"


def _resolve_audio_mime(mime_type: str, file_format: str) -> str:
    if mime_type:
        return mime_type
    fmt = file_format.lower()
    if fmt in ("m4a", "mp4"):
        return "audio/mp4"
    if fmt == "wav":
        return "audio/wav"
    if fmt == "webm":
        return "audio/webm"
    if fmt == "aac":
        return "audio/aac"
    return "audio/mpeg"


class DashScopeClient:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    @property
    def configured(self) -> bool:
        return bool(self._settings.effective_dashscope_api_key)

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._settings.effective_dashscope_api_key}",
            "Content-Type": "application/json",
        }

    def _generation_url(self) -> str:
        return self._settings.dashscope_base_url.rstrip("/") + "/api/v1/services/aigc/multimodal-generation/generation"

    def _extract_ocr_text(self, payload: dict[str, Any]) -> str:
        choices = (payload.get("output") or {}).get("choices") or []
        if not choices:
            return ""
        message = choices[0].get("message") or {}
        content = message.get("content")
        if not isinstance(content, list) or not content:
            return ""
        first = content[0]
        if first.get("text"):
            return _normalize_text(_strip_code_fence(str(first["text"])))
        ocr_result = first.get("ocr_result") or {}
        words_info = ocr_result.get("words_info") or []
        if isinstance(words_info, list):
            lines = [str(item.get("text") or "").strip() for item in words_info if item.get("text")]
            return _normalize_text("\n".join(lines))
        return ""

    async def ocr_image(
        self,
        *,
        image_base64: str,
        mime_type: str = "",
        file_type: str = "",
    ) -> dict[str, Any]:
        if not self.configured:
            raise RuntimeError("DashScope API key is not configured")
        data_url = f"data:{_resolve_image_mime(mime_type, file_type)};base64,{image_base64}"
        payload = {
            "model": self._settings.ocr_model,
            "input": {
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "image": data_url,
                                "min_pixels": 3072,
                                "max_pixels": 8388608,
                                "enable_rotate": False,
                            }
                        ],
                    }
                ]
            },
            "parameters": {"ocr_options": {"task": self._settings.ocr_task}},
        }
        timeout = self._settings.ocr_timeout / 1000
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(self._generation_url(), json=payload, headers=self._headers())
            raise_for_provider_response(response)
            data = response.json()
        text = self._extract_ocr_text(data)
        return {
            "text": text,
            "provider": self._settings.ocr_model,
            "status": "ok" if text else "empty",
        }

    async def asr_audio(
        self,
        *,
        audio_base64: str,
        mime_type: str = "",
        file_format: str = "",
    ) -> dict[str, Any]:
        if not self.configured:
            raise RuntimeError("DashScope API key is not configured")
        data_url = f"data:{_resolve_audio_mime(mime_type, file_format)};base64,{audio_base64}"
        payload = {
            "model": self._settings.asr_model,
            "input": {
                "messages": [
                    {"role": "system", "content": [{"text": ""}]},
                    {"role": "user", "content": [{"audio": data_url}]},
                ]
            },
            "parameters": {"asr_options": {"enable_itn": False}},
        }
        timeout = self._settings.asr_timeout / 1000
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(self._generation_url(), json=payload, headers=self._headers())
            raise_for_provider_response(response)
            data = response.json()
        text = ""
        choices = (data.get("output") or {}).get("choices") or []
        if choices:
            content = (choices[0].get("message") or {}).get("content")
            if isinstance(content, list) and content and content[0].get("text"):
                text = _normalize_text(str(content[0]["text"]))
        return {
            "text": text,
            "provider": self._settings.asr_model,
            "status": "ok" if text else "empty",
        }
