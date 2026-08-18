from __future__ import annotations

import json
import re
from typing import Any


AUDIT_PROMPT = (
    "You are a strict source-grounding auditor for professional document drafts. "
    "Compare only SOURCE and DRAFT. Identify exact draft fragments that introduce a diagnosis, diagnostic basis, "
    "differential diagnosis, clinical interpretation, examination finding, treatment, medication, monitoring plan, "
    "risk, prognosis, causal explanation, or recommendation that is not explicitly stated in SOURCE. "
    "Normal grammar, headings, chronology, and neutral paraphrase are allowed. A clearly labeled initial or suspected "
    "diagnosis may remain only with the same certainty. Audit sentence by sentence and return every unsupported claim. "
    "Inferring a diagnosis from symptoms, inferring medication or treatment restrictions from an allergy, or adding a "
    "purpose such as 'to clarify the diagnosis' to a stated test plan is unsupported unless SOURCE explicitly says it. Return JSON only as "
    '{"unsupportedFragments":[{"text":"exact fragment","category":"category","reason":"short Chinese reason"}]}. '
    "Return an empty array when fully grounded."
)


def _parse_json(value: str) -> dict[str, Any]:
    cleaned = re.sub(r"^```(?:json)?\s*|```$", "", str(value or "").strip(), flags=re.IGNORECASE).strip()
    parsed = json.loads(cleaned)
    return parsed if isinstance(parsed, dict) else {}


async def audit_source_grounding(client: Any, settings: Any, source_text: str, body_text: str, template: dict[str, Any] | None, mode: str) -> list[dict[str, Any]]:
    if mode != "professional" or not template:
        return []
    try:
        raw = await client.chat_completions(
            model=settings.text_model,
            messages=[
                {"role": "system", "content": AUDIT_PROMPT},
                {"role": "user", "content": json.dumps({
                    "source": str(source_text or ""),
                    "templateContract": template.get("generationContract") or template.get("generation_contract") or {},
                    "draft": str(body_text or ""),
                }, ensure_ascii=False)},
            ],
            temperature=0,
            max_tokens=900,
        )
        fragments = _parse_json(raw).get("unsupportedFragments") or []
        return [
            {
                "code": "UNSUPPORTED_CLINICAL_CLAIM",
                "fragment": str(item.get("text") or "").strip(),
                "category": str(item.get("category") or "other"),
                "message": str(item.get("reason") or "草稿包含源材料未明确提供的专业判断或处理内容"),
            }
            for item in fragments[:12]
            if isinstance(item, dict) and str(item.get("text") or "").strip()
        ]
    except Exception:
        return [{"code": "GROUNDING_AUDIT_UNAVAILABLE", "message": "事实依据核对暂时不可用，请重试"}]
