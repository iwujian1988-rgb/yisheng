#!/usr/bin/env python3
"""Quick smoke test for TextAgent (requires AI_API_KEY + endpoint in .env)."""

import asyncio
import sys

from app.agents.text import TextAgent


async def main() -> None:
    agent = TextAgent()
    try:
        result = await agent.execute(
            {
                "text": "主诉头痛两天，体温37.8摄氏度。",
                "task": "organize",
                "mode": "general",
            }
        )
        print("ok", result.get("bodyText", "")[:80])
    except Exception as exc:
        print("error:", exc)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
