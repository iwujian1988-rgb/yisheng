from __future__ import annotations

import time
from abc import ABC, abstractmethod
from typing import Any

from app.config import Settings, get_settings


class AgentResult:
    def __init__(self, agent: str, result: dict[str, Any], duration_ms: int) -> None:
        self.agent = agent
        self.result = result
        self.duration_ms = duration_ms


class BaseAgent(ABC):
    name: str = "base"

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    async def run(self, data: dict[str, Any]) -> AgentResult:
        started = time.perf_counter()
        result = await self.execute(data)
        duration_ms = int((time.perf_counter() - started) * 1000)
        return AgentResult(agent=self.name, result=result, duration_ms=duration_ms)

    @abstractmethod
    async def execute(self, data: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError
