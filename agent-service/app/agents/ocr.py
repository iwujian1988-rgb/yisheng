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


class OcrAgent(BaseAgent):
    name = "ocr"

    async def execute(self, data: dict[str, Any]) -> dict[str, Any]:
        image_raw = str(data.get("imageBase64") or data.get("image_base64") or "").strip()
        if not image_raw:
            raise ValueError("imageBase64 is required")

        mime_type, image_base64 = _parse_data_url(image_raw)
        if not image_base64:
            raise ValueError("imageBase64 is invalid")

        image_bytes = _estimate_base64_bytes(image_base64)
        if image_bytes > self.settings.ocr_max_bytes:
            raise ValueError("image is too large")

        client = DashScopeClient(self.settings)
        result = await client.ocr_image(
            image_base64=image_base64,
            mime_type=mime_type or str(data.get("mimeType") or data.get("mime_type") or ""),
            file_type=str(data.get("fileType") or data.get("file_type") or ""),
        )
        text = result.get("text") or ""
        lines = [{"index": idx, "text": line, "field": None} for idx, line in enumerate(text.split("\n")) if line]
        return {
            "text": text,
            "lines": lines,
            "charCount": len(text),
            "provider": result.get("provider"),
            "engine": self.settings.ocr_model,
            "status": result.get("status") or "ok",
            "imageBytes": image_bytes,
        }
