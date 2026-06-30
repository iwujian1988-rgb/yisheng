"""Diagnose which API keys are loaded and test DashScope connectivity."""
from __future__ import annotations

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import get_settings
from app.clients.chat import ChatClient
from app.clients.dashscope import DashScopeClient

TINY_JPEG_B64 = (
    "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////"
    "2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/"
    "8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/"
    "9oADAMBAAIRAxEAPwCdABmX/9k="
)


def mask(key: str) -> str:
    key = key or ""
    if len(key) < 12:
        return "(empty)"
    return key[:7] + "..." + key[-4:]


async def main() -> None:
    get_settings.cache_clear()
    settings = get_settings()

    print("=== env sources ===")
    print("process AI_API_KEY:", mask(os.environ.get("AI_API_KEY", "")))
    print("process DASHSCOPE_API_KEY:", mask(os.environ.get("DASHSCOPE_API_KEY", "")))
    print("settings AI_API_KEY:", mask(settings.ai_api_key))
    print("settings DASHSCOPE_API_KEY:", mask(settings.dashscope_api_key))
    print("effective dashscope key:", mask(settings.effective_dashscope_api_key))

    print("\n=== chat test (deepseek-v3 via compatible-mode) ===")
    try:
        text = await ChatClient(settings).chat_completions(
            model=settings.text_model,
            messages=[{"role": "user", "content": "reply OK"}],
            max_tokens=8,
        )
        print("chat OK:", repr(text[:40]))
    except Exception as exc:
        print("chat FAIL:", exc)

    print("\n=== ocr test (qwen-vl-ocr) ===")
    try:
        result = await DashScopeClient(settings).ocr_image(
            image_base64=TINY_JPEG_B64,
            mime_type="image/jpeg",
        )
        print("ocr OK:", result.get("status"), "chars=", len(result.get("text") or ""))
    except Exception as exc:
        print("ocr FAIL:", exc)


if __name__ == "__main__":
    asyncio.run(main())
