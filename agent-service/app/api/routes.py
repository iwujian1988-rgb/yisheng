from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.agents.asr import AsrAgent
from app.agents.ocr import OcrAgent
from app.agents.orchestrator import OrchestratorAgent
from app.agents.template import TemplateAgent
from app.agents.text import TextAgent
from app.api.models import AgentRequest, AgentResponse, HealthResponse
from app.clients.chat import ChatClient
from app.clients.dashscope import DashScopeClient
from app.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter()

AGENT_MAP = {
    "text": TextAgent,
    "template": TemplateAgent,
    "ocr": OcrAgent,
    "asr": AsrAgent,
    "chat": OrchestratorAgent,
    "orchestrate": OrchestratorAgent,
}


def _verify_service_key(authorization: str | None) -> None:
    settings = get_settings()
    if not settings.backend_api_key:
        return
    expected = f"Bearer {settings.backend_api_key}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(
        ai_configured=settings.ai_configured,
        dashscope_configured=bool(settings.dashscope_api_key),
    )


@router.post("/v1/agent/{agent_type}", response_model=AgentResponse)
async def invoke_agent(
    agent_type: str,
    body: AgentRequest,
    request: Request,
    authorization: str | None = Header(default=None),
    x_request_id: str | None = Header(default=None, alias="X-Request-ID"),
    x_user_id: str | None = Header(default=None, alias="X-User-ID"),
) -> AgentResponse:
    _verify_service_key(authorization)
    agent_key = agent_type.strip().lower()
    agent_cls = AGENT_MAP.get(agent_key)
    if not agent_cls:
        raise HTTPException(status_code=404, detail=f"Unknown agent type: {agent_type}")

    agent = agent_cls()
    try:
        outcome = await agent.run(body.data)
    except NotImplementedError as exc:
        raise HTTPException(status_code=501, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception(
            "agent_failed type=%s request_id=%s user_id=%s",
            agent_key,
            x_request_id,
            x_user_id or body.user_context.user_id,
        )
        return AgentResponse(
            success=False,
            agent=agent_key,
            error={"code": "AGENT_FAILED", "message": str(exc)},
        )

    response = AgentResponse(
        success=True,
        result=outcome.result,
        agent=outcome.agent,
        duration=outcome.duration_ms,
    )
    if x_request_id:
        request.state.response_headers = {
            "X-Request-ID": x_request_id,
            "X-Agent-Name": outcome.agent,
            "X-Duration-Ms": str(outcome.duration_ms),
        }
    return response


@router.post("/v1/agent/chat/stream")
async def invoke_chat_stream(
    body: AgentRequest,
    authorization: str | None = Header(default=None),
    x_request_id: str | None = Header(default=None, alias="X-Request-ID"),
    x_user_id: str | None = Header(default=None, alias="X-User-ID"),
) -> StreamingResponse:
    _verify_service_key(authorization)
    agent = OrchestratorAgent()

    async def event_stream():
        try:
            async for chunk in agent.execute_stream(body.data):
                yield chunk
        except Exception as exc:
            logger.exception(
                "agent_stream_failed request_id=%s user_id=%s",
                x_request_id,
                x_user_id or body.user_context.user_id,
            )
            from app.utils.sse import format_sse

            yield format_sse("error", {"code": "AGENT_FAILED", "message": str(exc)})

    headers = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    if x_request_id:
        headers["X-Request-ID"] = x_request_id
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream; charset=utf-8",
        headers=headers,
    )


@router.get("/v1/diagnostics/chat")
async def chat_ping(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    _verify_service_key(authorization)
    settings = get_settings()
    client = ChatClient(settings)
    if not client.configured:
        raise HTTPException(status_code=503, detail="AI chat provider is not configured")
    content = await client.chat_completions(
        model=settings.text_model,
        messages=[
            {"role": "system", "content": "Reply with OK only."},
            {"role": "user", "content": "ping"},
        ],
        max_tokens=16,
    )
    return {"status": "ok", "sample": content.strip()[:32]}
