from __future__ import annotations

import re
from typing import Any

from app.agents.base import BaseAgent
from app.clients.dashscope import DashScopeClient


def _parse_data_url(value: str) -> tuple[str, str]:
    raw = str(value or "").strip()
    match = re.match(r"^data:([^;]+);base64,(.*)$", raw, re.DOTALL)
    if not match:
        return "", raw
    return match.group(1), match.group(2)


def _estimate_base64_bytes(base64_data: str) -> int:
    normalized = re.sub(r"\s", "", base64_data or "")
    if not normalized:
        return 0
    padding = 2 if normalized.endswith("==") else 1 if normalized.endswith("=") else 0
    return max(0, len(normalized) * 3 // 4 - padding)


class AsrAgent(BaseAgent):
    name = "asr"

    async def execute(self, data: dict[str, Any]) -> dict[str, Any]:
        audio_raw = str(data.get("audioBase64") or data.get("audio_base64") or "").strip()
        if not audio_raw:
            raise ValueError("audioBase64 is required")

        mime_type, audio_base64 = _parse_data_url(audio_raw)
        if not audio_base64:
            raise ValueError("audioBase64 is invalid")

        audio_bytes = _estimate_base64_bytes(audio_base64)
        if audio_bytes > self.settings.asr_max_bytes:
            raise ValueError("audio is too large")

        client = DashScopeClient(self.settings)
        result = await client.asr_audio(
            audio_base64=audio_base64,
            mime_type=mime_type or str(data.get("mimeType") or data.get("mime_type") or ""),
            file_format=str(data.get("format") or data.get("fileType") or ""),
        )
        text = result.get("text") or ""
        return {
            "text": text,
            "charCount": len(text),
            "provider": result.get("provider"),
            "engine": self.settings.asr_model,
            "status": result.get("status") or "ok",
            "audioBytes": audio_bytes,
        }
