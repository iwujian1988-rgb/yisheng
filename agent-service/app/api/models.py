from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class UserContext(BaseModel):
    user_id: str = ""
    member_status: str = "inactive"
    device_status: str = "disconnected"


class AgentRequest(BaseModel):
    user_context: UserContext = Field(default_factory=UserContext)
    data: dict[str, Any] = Field(default_factory=dict)


class AgentResponse(BaseModel):
    success: bool = True
    result: dict[str, Any] = Field(default_factory=dict)
    agent: str = ""
    duration: int = 0
    error: dict[str, Any] | None = None


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    ai_configured: bool
    dashscope_configured: bool


class ChatAttachment(BaseModel):
    type: Literal["image", "audio", "text"]
    data: str = ""


class ChatRequestData(BaseModel):
    message: str = ""
    attachments: list[ChatAttachment] = Field(default_factory=list)
    context: dict[str, Any] = Field(default_factory=dict)
