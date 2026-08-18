from __future__ import annotations

import asyncio
import json
import logging
import re
import time
from collections.abc import AsyncIterator
from typing import Any

from app.agents.asr import AsrAgent
from app.agents.base import BaseAgent
from app.agents.ocr import OcrAgent
from app.agents.template import TemplateAgent
from app.agents.text import TextAgent
from app.clients.chat import ChatClient
from app.utils.agent_context import (
    AgentSources,
    SourceItem,
    merge_histories,
    normalize_source_priority,
    template_plan_summary,
)
from app.utils.prompts import load_prompt
from app.utils.session_store import get_session_store
from app.utils.source_summary import truncate_sources_dict
from app.utils.sse import format_sse
from app.utils.text_output import filter_resolved_grounding_errors, keep_actionable_confirm_items, remove_misplaced_report_facts, remove_resolved_identity_questions, remove_unavailable_template_sections, remove_unsupported_judgment_sections, split_sectioned_output
from app.utils.text_quality import assess_text_quality, format_quality_warning
from app.utils.grounding_audit import audit_source_grounding
from app.utils.structured_facts import materialize_required_source_facts, materialize_structured_facts

logger = logging.getLogger(__name__)

TEMPLATE_KEYWORDS = ("模板", "做成模板", "生成模板", "保存为模板")
ORGANIZE_KEYWORDS = ("整理", "记录", "病历", "病程", "门诊", "报告", "识别并")
EXTRACT_FIELD_KEYWORDS = (
    "诊断",
    "主诉",
    "现病史",
    "既往史",
    "体格检查",
    "辅助检查",
    "处理",
    "医嘱",
    "处方",
    "入院诊断",
    "出院诊断",
)


def _strip_json_fence(text: str) -> str:
    value = text.strip()
    match = re.match(r"^```(?:json)?\s*([\s\S]*?)```$", value)
    return match.group(1).strip() if match else value


class OrchestratorAgent(BaseAgent):
    name = "orchestrator"

    def _session_store(self):
        return get_session_store(self.settings.session_context_ttl, self.settings.session_max_messages)

    def _session_key(self, user_id: str, context_id: str) -> str:
        """Isolate remembered material by document task, never by user alone."""
        clean_context = re.sub(r"[^a-zA-Z0-9_-]", "", context_id or "")[:80]
        if not user_id or not clean_context:
            return ""
        return f"{user_id}:{clean_context}"

    def _merge_material_text(self, sources: AgentSources, material_text: str) -> AgentSources:
        value = (material_text or "").strip()
        if not value:
            return sources
        existing = sources.pasted_text.strip()
        sources.pasted_text = "\n\n".join(part for part in (existing, value) if part)
        return sources

    async def _run_ocr(self, attachment: dict[str, Any]) -> str:
        agent = OcrAgent(self.settings)
        data = attachment.get("data") or attachment.get("imageBase64") or ""
        mime = attachment.get("mimeType") or attachment.get("mime_type") or ""
        outcome = await agent.run(
            {
                "imageBase64": data,
                "mimeType": mime,
                "fileType": attachment.get("fileType") or attachment.get("file_type") or "",
            }
        )
        return str((outcome.result or {}).get("text") or "").strip()

    async def _run_asr(self, attachment: dict[str, Any]) -> str:
        agent = AsrAgent(self.settings)
        data = attachment.get("data") or attachment.get("audioBase64") or ""
        outcome = await agent.run(
            {
                "audioBase64": data,
                "mimeType": attachment.get("mimeType") or attachment.get("mime_type") or "",
                "format": attachment.get("format") or "",
            }
        )
        return str((outcome.result or {}).get("text") or "").strip()

    async def _resolve_image_text(self, item: dict[str, Any]) -> tuple[str, str]:
        cached = str(item.get("ocrText") or item.get("ocr_text") or "").strip()
        if cached:
            return cached, "cached"
        text = await self._run_ocr(item)
        return text, "ok"

    async def _collect_sources(self, attachments: list[dict[str, Any]]) -> tuple[AgentSources, list[dict[str, Any]]]:
        sources = AgentSources()
        steps: list[dict[str, Any]] = []
        pasted_parts: list[str] = []
        ocr_index = 0
        asr_index = 0

        image_jobs: list[tuple[int, dict[str, Any]]] = []
        audio_jobs: list[tuple[int, dict[str, Any]]] = []

        for item in attachments:
            kind = str(item.get("type") or "").lower()
            if kind == "image":
                ocr_index += 1
                image_jobs.append((ocr_index, item))
            elif kind == "audio":
                asr_index += 1
                audio_jobs.append((asr_index, item))
            elif kind == "text":
                text = str(item.get("data") or item.get("text") or "").strip()
                if text:
                    pasted_parts.append(text)
                    steps.append({"agent": "pasted", "status": "ok", "chars": len(text)})

        if image_jobs:

            async def _image_task(index: int, attachment: dict[str, Any]) -> tuple[int, str, str]:
                text, status = await self._resolve_image_text(attachment)
                return index, text, status

            image_results = await asyncio.gather(
                *[_image_task(index, attachment) for index, attachment in image_jobs]
            )
            for index, text, status in sorted(image_results, key=lambda item: item[0]):
                steps.append({"agent": "ocr", "status": status, "index": index, "chars": len(text)})
                if text:
                    sources.ocr.append(SourceItem(index=index, text=text))

        if audio_jobs:

            async def _audio_task(index: int, attachment: dict[str, Any]) -> tuple[int, str]:
                text = await self._run_asr(attachment)
                return index, text

            audio_results = await asyncio.gather(
                *[_audio_task(index, attachment) for index, attachment in audio_jobs]
            )
            for index, text in sorted(audio_results, key=lambda item: item[0]):
                steps.append({"agent": "asr", "status": "ok", "index": index, "chars": len(text)})
                if text:
                    sources.asr.append(SourceItem(index=index, text=text))

        if pasted_parts:
            sources.pasted_text = "\n\n".join(pasted_parts).strip()
        return sources, steps

    def _sources_from_history(self, history: list[dict[str, Any]]) -> AgentSources:
        for item in reversed(history):
            if not isinstance(item, dict):
                continue
            if item.get("role") != "context" or item.get("kind") != "sources":
                continue
            payload = item.get("sources") if isinstance(item.get("sources"), dict) else item
            sources = AgentSources.from_dict(payload)
            if sources.has_content():
                return sources
        return AgentSources()

    def _detect_extract_target(self, message: str) -> str:
        for keyword in EXTRACT_FIELD_KEYWORDS:
            if keyword in (message or ""):
                return keyword
        return ""

    def _heuristic_plan(
        self,
        user_instruction: str,
        mode: str,
        sources: AgentSources,
        template: dict[str, Any] | None,
    ) -> dict[str, Any]:
        msg = user_instruction or ""
        has_media = sources.has_content()
        if any(keyword in msg for keyword in TEMPLATE_KEYWORDS):
            template_type = ""
            if template:
                template_type = str(template.get("template_type") or template.get("templateType") or "")
            return {
                "task": "template_create",
                "mode": mode,
                "templateType": template_type or "通用",
                "sourcePriority": normalize_source_priority(None, sources),
                "reason": "heuristic template intent",
            }
        if has_media and template:
            return {
                "task": "text_organize",
                "mode": mode,
                "sourcePriority": normalize_source_priority(None, sources),
                "reason": "selected template requires document organization",
            }
        if has_media and any(keyword in msg for keyword in ORGANIZE_KEYWORDS):
            return {
                "task": "text_organize",
                "mode": mode,
                "sourcePriority": normalize_source_priority(None, sources),
                "reason": "heuristic media organize",
            }
        if has_media and not msg.strip():
            return {
                "task": "ocr_only",
                "mode": mode,
                "sourcePriority": normalize_source_priority(None, sources),
                "reason": "media only",
            }
        if "润色" in msg:
            return {"task": "text_polish", "mode": mode, "sourcePriority": normalize_source_priority(None, sources), "reason": "heuristic polish"}
        if "要点" in msg or "提取" in msg:
            target = self._detect_extract_target(msg)
            plan: dict[str, Any] = {
                "task": "text_extract",
                "mode": mode,
                "sourcePriority": normalize_source_priority(None, sources),
                "reason": "heuristic extract",
            }
            if target:
                plan["extractTarget"] = target
            return plan
        if "检查" in msg or "完整" in msg:
            return {"task": "text_review", "mode": mode, "sourcePriority": normalize_source_priority(None, sources), "reason": "heuristic review"}
        if "转换" in msg or "通知" in msg or "邮件" in msg:
            return {"task": "text_convert", "mode": mode, "sourcePriority": normalize_source_priority(None, sources), "reason": "heuristic convert"}
        return {
            "task": "text_organize",
            "mode": mode,
            "sourcePriority": normalize_source_priority(None, sources),
            "reason": "default organize",
        }

    def _should_skip_llm_plan(self, user_instruction: str, sources: AgentSources, heuristic_plan: dict[str, Any]) -> bool:
        msg = (user_instruction or "").strip()
        task = str(heuristic_plan.get("task") or "")
        if task in ("template_create", "ocr_only"):
            return True
        if task == "text_extract" and ("提取" in msg or "要点" in msg or self._detect_extract_target(msg)):
            return True
        if task == "text_polish" and "润色" in msg:
            return True
        if task == "text_review" and ("检查" in msg or "完整" in msg):
            return True
        if task == "text_convert" and any(keyword in msg for keyword in ("转换", "通知", "邮件")):
            return True
        if task == "text_organize" and sources.has_content() and any(keyword in msg for keyword in ORGANIZE_KEYWORDS):
            return True
        if not msg and sources.has_content():
            return True
        return False

    async def _llm_plan(
        self,
        user_instruction: str,
        mode: str,
        sources: AgentSources,
        template: dict[str, Any] | None,
    ) -> dict[str, Any] | None:
        client = ChatClient(self.settings)
        if not client.configured:
            return None
        prompt = load_prompt("orchestrator")
        payload = {
            "userInstruction": user_instruction,
            "mode": mode,
            "sources": sources.preview_dict(2000),
            "template": template_plan_summary(template),
        }
        try:
            raw = await client.chat_completions(
                model=self.settings.orchestrator_model,
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
                ],
                temperature=0.1,
                max_tokens=512,
            )
            parsed = json.loads(_strip_json_fence(raw))
            if isinstance(parsed, dict) and parsed.get("task"):
                return parsed
        except Exception:
            logger.exception("orchestrator_plan_failed")
        return None

    def _resolve_plan(
        self,
        user_instruction: str,
        mode: str,
        sources: AgentSources,
        template: dict[str, Any] | None,
        llm_plan: dict[str, Any] | None,
        heuristic_plan: dict[str, Any],
    ) -> dict[str, Any]:
        msg = user_instruction or ""
        if "提取" in msg:
            target = self._detect_extract_target(msg)
            plan: dict[str, Any] = {
                "task": "text_extract",
                "mode": (llm_plan or {}).get("mode") or heuristic_plan.get("mode") or mode,
                "sourcePriority": normalize_source_priority(
                    (llm_plan or {}).get("sourcePriority"),
                    sources,
                ),
                "reason": "user requested field extract",
            }
            if target:
                plan["extractTarget"] = target
            elif llm_plan and llm_plan.get("extractTarget"):
                plan["extractTarget"] = llm_plan["extractTarget"]
            return plan

        plan = llm_plan if llm_plan and llm_plan.get("task") else heuristic_plan
        plan["sourcePriority"] = normalize_source_priority(plan.get("sourcePriority"), sources)
        return plan

    def _map_text_task(self, plan_task: str) -> str:
        mapping = {
            "text_organize": "organize",
            "text_polish": "polish",
            "text_extract": "extract",
            "text_review": "review",
            "text_convert": "convert",
        }
        return mapping.get(plan_task, "organize")

    async def _persist_round(
        self,
        user_id: str,
        user_instruction: str,
        assistant_text: str,
        sources: AgentSources,
        *,
        has_new_sources: bool,
    ) -> None:
        if not user_id:
            return
        store = self._session_store()
        store.append(user_id, "user", user_instruction or ("[附件]" if has_new_sources else "[消息]"))
        store.append(user_id, "assistant", assistant_text)
        if not has_new_sources:
            return

        async def _truncate_dict(sources_dict: dict[str, Any]) -> dict[str, Any]:
            return truncate_sources_dict(sources_dict, self.settings.session_source_summary_max_chars)

        await store.archive_full_sources(user_id, _truncate_dict)
        store.append_sources_context(user_id, sources.to_dict(), "full")

    async def execute(self, data: dict[str, Any]) -> dict[str, Any]:
        timings: dict[str, int] = {}
        started = time.perf_counter()

        user_instruction = str(data.get("message") or "").strip()
        mode = str(data.get("mode") or "general").strip().lower()
        if mode not in ("general", "professional"):
            mode = "general"

        user_id = str((data.get("userId") or data.get("user_id") or "")).strip()
        context_id = str(data.get("contextId") or data.get("context_id") or "").strip()
        session_key = self._session_key(user_id, context_id)
        attachments = data.get("attachments") if isinstance(data.get("attachments"), list) else []
        template = data.get("template") if isinstance(data.get("template"), dict) else None
        baseline = data.get("baseline_fields") if isinstance(data.get("baseline_fields"), dict) else None
        client_history = data.get("messages") if isinstance(data.get("messages"), list) else []

        session_store = self._session_store()
        server_history = session_store.get(session_key) if session_key else []
        history = merge_histories(client_history, server_history)

        collect_started = time.perf_counter()
        sources, steps = await self._collect_sources(attachments)
        sources = self._merge_material_text(sources, str(data.get("materialText") or ""))
        timings["collect_ms"] = int((time.perf_counter() - collect_started) * 1000)

        has_new_sources = sources.has_content()
        if not has_new_sources and session_key and bool(data.get("reuseContextSources")):
            sources = self._sources_from_history(history)

        heuristic_plan = self._heuristic_plan(user_instruction, mode, sources, template)
        llm_plan: dict[str, Any] | None = None
        plan_started = time.perf_counter()
        skip_llm = self.settings.orchestrator_skip_llm_heuristic and self._should_skip_llm_plan(
            user_instruction, sources, heuristic_plan
        )
        if skip_llm:
            steps.append({"agent": "plan", "status": "heuristic"})
        else:
            llm_plan = await self._llm_plan(user_instruction, mode, sources, template)
            steps.append({"agent": "plan", "status": "llm" if llm_plan else "heuristic_fallback"})
        timings["plan_ms"] = int((time.perf_counter() - plan_started) * 1000)

        plan = self._resolve_plan(user_instruction, mode, sources, template, llm_plan, heuristic_plan)
        logger.info(
            "orchestrator_plan task=%s mode=%s target=%s sources=%s reason=%s",
            plan.get("task"),
            plan.get("mode"),
            plan.get("extractTarget", ""),
            plan.get("sourcePriority"),
            plan.get("reason", ""),
        )

        plan_task = str(plan.get("task") or "text_organize")
        plan_mode = str(plan.get("mode") or mode)
        source_priority = normalize_source_priority(plan.get("sourcePriority"), sources)

        if plan_task == "ocr_only":
            body = sources.combined_text(source_priority)
            final = {
                "type": "text",
                "resultText": body,
                "bodyText": body,
                "confirmItems": [],
            }
            if session_key:
                await self._persist_round(session_key, user_instruction, body, sources, has_new_sources=has_new_sources)
            timings["total_ms"] = int((time.perf_counter() - started) * 1000)
            return {"finalResult": final, "steps": steps, "plan": plan, "timings": timings}

        if plan_task == "template_create":
            template_type = str(plan.get("templateType") or plan.get("template_type") or "通用").strip()
            content = sources.combined_text(source_priority)
            if not content:
                raise ValueError("template creation requires source content")
            template_agent = TemplateAgent(self.settings)
            outcome = await template_agent.run(
                {
                    "content": content,
                    "templateType": template_type,
                    "baselineFields": baseline or data.get("baselineFields") or {},
                    "templateName": data.get("templateName") or "",
                }
            )
            result = outcome.result or {}
            steps.append({"agent": "template", "status": "ok"})
            final = {
                "type": "template",
                "templateDraft": result.get("templateDraft"),
                "success": result.get("success", True),
            }
            if session_key:
                await self._persist_round(
                    session_key,
                    user_instruction or "[创建模板]",
                    "已生成模板草稿",
                    sources,
                    has_new_sources=has_new_sources,
                )
            timings["total_ms"] = int((time.perf_counter() - started) * 1000)
            return {"finalResult": final, "steps": steps, "plan": plan, "timings": timings}

        if not sources.has_content() and not user_instruction:
            raise ValueError("user instruction or source content is required")

        text_agent = TextAgent(self.settings)
        text_payload: dict[str, Any] = {
            "userInstruction": user_instruction,
            "sources": sources.to_dict(),
            "sourcePriority": source_priority,
            "extractTarget": str(plan.get("extractTarget") or ""),
            "task": self._map_text_task(plan_task),
            "mode": plan_mode,
            "messages": history,
            "plan": plan,
            "detailLevel": str(data.get("detailLevel") or "standard"),
            "confirmedFields": data.get("confirmedFields") if isinstance(data.get("confirmedFields"), list) else [],
            "structuredFacts": data.get("structuredFacts") if isinstance(data.get("structuredFacts"), list) else [],
            "requiredSourceFacts": data.get("requiredSourceFacts") if isinstance(data.get("requiredSourceFacts"), list) else [],
            "qualitySourceText": str(data.get("qualitySourceText") or ""),
        }
        if template:
            text_payload["template"] = template
        elif baseline:
            text_payload["baseline_fields"] = baseline

        text_started = time.perf_counter()
        outcome = await text_agent.run(text_payload)
        timings["text_ms"] = int((time.perf_counter() - text_started) * 1000)

        result = outcome.result or {}
        steps.append({"agent": "text", "status": "ok", "task": text_payload["task"]})

        final = {
            "type": "text",
            "resultText": result.get("resultText") or "",
            "bodyText": result.get("bodyText") or "",
            "confirmItems": result.get("confirmItems") or [],
            "quality": result.get("quality") or None,
            "task": text_payload["task"],
            "mode": plan_mode,
        }
        if session_key:
            await self._persist_round(
                session_key,
                user_instruction,
                final.get("bodyText") or final.get("resultText") or "",
                sources,
                has_new_sources=has_new_sources,
            )
        timings["total_ms"] = int((time.perf_counter() - started) * 1000)
        return {"finalResult": final, "steps": steps, "plan": plan, "timings": timings}

    async def execute_stream(self, data: dict[str, Any]) -> AsyncIterator[str]:
        timings: dict[str, int] = {}
        started = time.perf_counter()

        user_instruction = str(data.get("message") or "").strip()
        mode = str(data.get("mode") or "general").strip().lower()
        if mode not in ("general", "professional"):
            mode = "general"

        user_id = str((data.get("userId") or data.get("user_id") or "")).strip()
        context_id = str(data.get("contextId") or data.get("context_id") or "").strip()
        session_key = self._session_key(user_id, context_id)
        attachments = data.get("attachments") if isinstance(data.get("attachments"), list) else []
        template = data.get("template") if isinstance(data.get("template"), dict) else None
        baseline = data.get("baseline_fields") if isinstance(data.get("baseline_fields"), dict) else None
        client_history = data.get("messages") if isinstance(data.get("messages"), list) else []

        session_store = self._session_store()
        server_history = session_store.get(session_key) if session_key else []
        history = merge_histories(client_history, server_history)

        needs_server_ocr = any(
            str(item.get("type") or "").lower() == "image"
            and not str(item.get("ocrText") or item.get("ocr_text") or "").strip()
            for item in attachments
        )
        yield format_sse(
            "status",
            {"stage": "collect", "label": "识别图片并生成中…" if needs_server_ocr else "正在生成回复…"},
        )

        collect_started = time.perf_counter()
        sources, steps = await self._collect_sources(attachments)
        sources = self._merge_material_text(sources, str(data.get("materialText") or ""))
        timings["collect_ms"] = int((time.perf_counter() - collect_started) * 1000)

        has_new_sources = sources.has_content()
        if not has_new_sources and session_key and bool(data.get("reuseContextSources")):
            sources = self._sources_from_history(history)

        heuristic_plan = self._heuristic_plan(user_instruction, mode, sources, template)
        llm_plan: dict[str, Any] | None = None
        plan_started = time.perf_counter()
        skip_llm = self.settings.orchestrator_skip_llm_heuristic and self._should_skip_llm_plan(
            user_instruction, sources, heuristic_plan
        )
        if skip_llm:
            steps.append({"agent": "plan", "status": "heuristic"})
        else:
            llm_plan = await self._llm_plan(user_instruction, mode, sources, template)
            steps.append({"agent": "plan", "status": "llm" if llm_plan else "heuristic_fallback"})
        timings["plan_ms"] = int((time.perf_counter() - plan_started) * 1000)

        plan = self._resolve_plan(user_instruction, mode, sources, template, llm_plan, heuristic_plan)
        plan_task = str(plan.get("task") or "text_organize")
        plan_mode = str(plan.get("mode") or mode)
        source_priority = normalize_source_priority(plan.get("sourcePriority"), sources)

        yield format_sse("status", {"stage": "generate", "label": "正在生成回复…"})

        if plan_task == "ocr_only":
            body = sources.combined_text(source_priority)
            final = {
                "type": "text",
                "resultText": body,
                "bodyText": body,
                "confirmItems": [],
            }
            if session_key:
                await self._persist_round(session_key, user_instruction, body, sources, has_new_sources=has_new_sources)
            timings["total_ms"] = int((time.perf_counter() - started) * 1000)
            yield format_sse(
                "done",
                {"finalResult": final, "steps": steps, "plan": plan, "timings": timings},
            )
            return

        if plan_task == "template_create":
            template_type = str(plan.get("templateType") or plan.get("template_type") or "通用").strip()
            content = sources.combined_text(source_priority)
            if not content:
                yield format_sse("error", {"code": "AGENT_FAILED", "message": "template creation requires source content"})
                return
            template_agent = TemplateAgent(self.settings)
            outcome = await template_agent.run(
                {
                    "content": content,
                    "templateType": template_type,
                    "baselineFields": baseline or data.get("baselineFields") or {},
                    "templateName": data.get("templateName") or "",
                }
            )
            result = outcome.result or {}
            steps.append({"agent": "template", "status": "ok"})
            final = {
                "type": "template",
                "templateDraft": result.get("templateDraft"),
                "success": result.get("success", True),
            }
            if session_key:
                await self._persist_round(
                    session_key,
                    user_instruction or "[创建模板]",
                    "已生成模板草稿",
                    sources,
                    has_new_sources=has_new_sources,
                )
            timings["total_ms"] = int((time.perf_counter() - started) * 1000)
            yield format_sse(
                "done",
                {"finalResult": final, "steps": steps, "plan": plan, "timings": timings},
            )
            return

        if not sources.has_content() and not user_instruction:
            yield format_sse("error", {"code": "AGENT_FAILED", "message": "user instruction or source content is required"})
            return

        text_agent = TextAgent(self.settings)
        text_payload: dict[str, Any] = {
            "userInstruction": user_instruction,
            "sources": sources.to_dict(),
            "sourcePriority": source_priority,
            "extractTarget": str(plan.get("extractTarget") or ""),
            "task": self._map_text_task(plan_task),
            "mode": plan_mode,
            "messages": history,
            "plan": plan,
            "detailLevel": str(data.get("detailLevel") or "standard"),
            "confirmedFields": data.get("confirmedFields") if isinstance(data.get("confirmedFields"), list) else [],
            "structuredFacts": data.get("structuredFacts") if isinstance(data.get("structuredFacts"), list) else [],
        }
        if template:
            text_payload["template"] = template
        elif baseline:
            text_payload["baseline_fields"] = baseline

        text_started = time.perf_counter()
        raw_parts: list[str] = []
        try:
            async for chunk in text_agent.execute_stream(text_payload):
                raw_parts.append(chunk)
                yield format_sse("delta", {"content": chunk})
        except Exception as exc:
            logger.exception("orchestrator_stream_failed")
            yield format_sse("error", {"code": "AGENT_FAILED", "message": str(exc)})
            return

        timings["text_ms"] = int((time.perf_counter() - text_started) * 1000)
        steps.append({"agent": "text", "status": "ok", "task": text_payload["task"]})

        raw = "".join(raw_parts)
        sectioned = split_sectioned_output(raw)
        sectioned["body_text"] = remove_unavailable_template_sections(sectioned["body_text"], template)
        sectioned["body_text"] = remove_unsupported_judgment_sections(sectioned["body_text"], sources.combined_text(source_priority), template)
        sectioned["body_text"] = materialize_structured_facts(sectioned["body_text"], data.get("structuredFacts") if isinstance(data.get("structuredFacts"), list) else [])
        sectioned["body_text"] = remove_misplaced_report_facts(sectioned["body_text"], text_payload.get("requiredSourceFacts"), template)
        sectioned["body_text"] = materialize_required_source_facts(sectioned["body_text"], text_payload.get("requiredSourceFacts"), text_payload.get("structuredFacts"))
        quality = assess_text_quality(
            str(data.get("qualitySourceText") or sources.combined_text(source_priority)), sectioned["body_text"], template, text_payload.get("confirmedFields"), text_payload.get("structuredFacts"), text_payload.get("requiredSourceFacts")
        )
        grounding_errors = await audit_source_grounding(
            ChatClient(self.settings), self.settings, sources.combined_text(source_priority), sectioned["body_text"], template, plan_mode
        )
        quality["hardErrors"].extend(filter_resolved_grounding_errors(
            grounding_errors, sectioned["body_text"], text_payload.get("requiredSourceFacts")
        ))
        quality["status"] = "needs_review" if quality["hardErrors"] or quality["warnings"] else "passed"
        if quality.get("hardErrors") or quality.get("missingConfirmedFields"):
            exact_fields = "\n".join(
                f"{field.get('label') or field.get('key')}：{field.get('value')}"
                for field in text_payload.get("confirmedFields") or []
                if isinstance(field, dict) and field.get("value")
            )
            repair_payload = dict(text_payload)
            repair_payload["disableRepair"] = True
            repair_payload["userInstruction"] = (
                str(user_instruction or "")
                + "\n请确保以下已确认字段逐字出现在语义对应栏目，不能保留占位符或遗漏：\n"
                + exact_fields
            ).strip()
            try:
                repaired = await text_agent.execute(repair_payload)
                repaired_quality = repaired.get("quality") if isinstance(repaired, dict) else None
                current_failure_count = (
                    len(quality.get("hardErrors") or [])
                    + len(quality.get("sourceConflicts") or [])
                    + len(quality.get("missingConfirmedFields") or [])
                )
                repaired_failure_count = (
                    len(repaired_quality.get("hardErrors") or [])
                    + len(repaired_quality.get("sourceConflicts") or [])
                    + len(repaired_quality.get("missingConfirmedFields") or [])
                ) if isinstance(repaired_quality, dict) else current_failure_count
                if isinstance(repaired_quality, dict) and repaired_failure_count < current_failure_count:
                    sectioned = {
                        "result_text": repaired.get("resultText") or repaired.get("bodyText") or "",
                        "body_text": repaired.get("bodyText") or "",
                        "confirm_items": repaired.get("confirmItems") or [],
                    }
                    quality = repaired_quality
            except Exception:
                logger.exception("confirmed_field_repair_failed")
        confirm_items = remove_resolved_identity_questions(list(sectioned["confirm_items"]), text_payload.get("confirmedFields") or [])
        confirm_items.extend(
            text for item in quality["warnings"]
            if (text := format_quality_warning(item)) and text not in confirm_items
        )
        missing_sections = quality.get("missingSections") or []
        if missing_sections:
            summary = "、".join(str(item) for item in missing_sections[:5]) + ("等" if len(missing_sections) > 5 else "")
            suggestion = f"当前草稿已按模板整理现有材料；如需继续完善，可补充：{summary}。"
            if suggestion not in confirm_items:
                confirm_items.append(suggestion)
        confirm_items = keep_actionable_confirm_items(confirm_items)
        result_text = "【正文】\n" + sectioned["body_text"] + "\n\n【待确认】\n" + ("\n".join(confirm_items) if confirm_items else "无")
        final = {
            "type": "text",
            "status": "needs_review" if quality.get("hardErrors") or quality.get("sourceConflicts") or quality.get("missingConfirmedFields") else "ok",
            "resultText": result_text,
            "bodyText": sectioned["body_text"],
            "confirmItems": confirm_items,
            "quality": quality,
            "task": text_payload["task"],
            "mode": plan_mode,
        }
        if session_key:
            await self._persist_round(
                session_key,
                user_instruction,
                final.get("bodyText") or final.get("resultText") or "",
                sources,
                has_new_sources=has_new_sources,
            )
        timings["total_ms"] = int((time.perf_counter() - started) * 1000)
        yield format_sse(
            "done",
            {"finalResult": final, "steps": steps, "plan": plan, "timings": timings},
        )
