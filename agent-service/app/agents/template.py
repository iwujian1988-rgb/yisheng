from __future__ import annotations

import json
import logging
import re
from typing import Any

from app.agents.base import BaseAgent
from app.clients.chat import ChatClient
from app.utils.prompts import load_prompt

logger = logging.getLogger(__name__)


def _strip_json_fence(text: str) -> str:
    value = text.strip()
    match = re.match(r"^```(?:json)?\s*([\s\S]*?)```$", value)
    if match:
        return match.group(1).strip()
    return value


class TemplateAgent(BaseAgent):
    name = "template"

    async def execute(self, data: dict[str, Any]) -> dict[str, Any]:
        content = str(data.get("content") or "").strip()
        if not content:
            raise ValueError("content is required")

        template_type = str(data.get("templateType") or data.get("template_type") or "").strip()
        if not template_type:
            raise ValueError("templateType is required")

        baseline = data.get("baselineFields") or data.get("baseline_fields") or {}
        template_name = str(data.get("templateName") or data.get("template_name") or "").strip()
        reject_non_medical = bool((data.get("options") or {}).get("rejectNonMedical", True))

        prompt_tpl = load_prompt("template")
        system_content = (
            prompt_tpl.replace("{{template_type}}", template_type)
            .replace("{{baseline_fields}}", json.dumps(baseline, ensure_ascii=False, indent=2))
            .replace("{{content}}", content)
        )

        client = ChatClient(self.settings)
        raw = await client.chat_completions(
            model=self.settings.template_model,
            messages=[
                {"role": "system", "content": system_content},
                {"role": "user", "content": "请输出 JSON。"},
            ],
            temperature=0.2,
            max_tokens=4096,
        )

        parsed_text = _strip_json_fence(raw)
        try:
            parsed = json.loads(parsed_text)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Template agent returned invalid JSON: {exc}") from exc

        if isinstance(parsed, dict) and parsed.get("error") == "NOT_MEDICAL_CONTENT":
            if reject_non_medical:
                return {
                    "success": False,
                    "error": {
                        "code": "NOT_MEDICAL_CONTENT",
                        "message": "该文本不属于医疗文书，无法生成模板",
                    },
                }
            parsed = {"template_type": template_type, "fields": []}

        fields = parsed.get("fields") if isinstance(parsed, dict) else []
        if not isinstance(fields, list):
            fields = []

        draft_name = template_name or f"我的{template_type}模板"
        return {
            "success": True,
            "templateDraft": {
                "template_type": template_type,
                "tag": "custom",
                "name": draft_name,
                "fields": fields,
                "sample": content,
            },
            "warnings": [],
        }
