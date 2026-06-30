from __future__ import annotations

import logging

from app.clients.chat import ChatClient
from app.config import Settings
from app.utils.agent_context import AgentSources, SourceItem, format_sources_block

logger = logging.getLogger(__name__)


async def summarize_sources(settings: Settings, sources: AgentSources, max_chars: int) -> AgentSources:
    if not sources.has_content():
        return sources
    block = format_sources_block(sources, "待摘要源材料")
    if len(block) <= max_chars:
        return sources

    client = ChatClient(settings)
    if not client.configured:
        return truncate_sources(sources, max_chars)

    try:
        raw = await client.chat_completions(
            model=settings.text_model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "你是医疗记录压缩助手。将输入压缩为摘要，必须保留所有数值、时间、药名、诊断措辞。"
                        f"总长度不超过 {max_chars} 字。只输出摘要正文，不要加标题。"
                    ),
                },
                {"role": "user", "content": block},
            ],
            temperature=0.1,
            max_tokens=min(2048, max_chars * 2),
        )
        summary = raw.strip()[:max_chars]
        return AgentSources(ocr=[], asr=[], pasted_text=summary)
    except Exception:
        logger.exception("source_summary_failed")
        return truncate_sources(sources, max_chars)


def truncate_sources(sources: AgentSources, max_chars: int) -> AgentSources:
    if not sources.has_content():
        return sources
    block = format_sources_block(sources, "源材料")
    if len(block) <= max_chars:
        return sources

    parts = len(sources.ocr) + len(sources.asr) + (1 if sources.pasted_text.strip() else 0)
    budget = max(120, max_chars // max(parts, 1))

    def _clip(text: str) -> str:
        value = str(text or "")
        if len(value) <= budget:
            return value
        return value[:budget] + "…"

    return AgentSources(
        ocr=[SourceItem(index=item.index, text=_clip(item.text)) for item in sources.ocr],
        asr=[SourceItem(index=item.index, text=_clip(item.text)) for item in sources.asr],
        pasted_text=_clip(sources.pasted_text),
    )


def truncate_sources_dict(sources_dict: dict, max_chars: int) -> dict:
    sources = AgentSources.from_dict(sources_dict if isinstance(sources_dict, dict) else None)
    return truncate_sources(sources, max_chars).to_dict()
