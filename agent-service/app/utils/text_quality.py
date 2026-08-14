from __future__ import annotations

import re
from typing import Any


CRITICAL_TOKEN_RE = re.compile(
    r"\d+(?:\.\d+)?\s*(?:mmHg|mmol/L|μmol/L|mg/dL|ng/mL|IU/L|U/L|mL/min|kg|cm|mg|g|ml|mL|℃|°C|次/分|次/分钟|天|周|月|年|小时|分)",
    re.IGNORECASE,
)
POLARITY_TERMS = ("否认", "未见", "无", "没有", "疑似", "考虑", "待排", "可能", "不详", "未知")


def _normalize(value: str) -> str:
    return re.sub(r"\s+", "", str(value or "")).lower()


def _meaningful_length(value: str) -> int:
    return len(re.sub(r"[\s\W_]+", "", str(value or ""), flags=re.UNICODE))


def assess_text_quality(source_text: str, body_text: str, template: dict[str, Any] | None = None) -> dict[str, Any]:
    source = str(source_text or "")
    body = str(body_text or "")
    normalized_body = _normalize(body)

    critical_tokens = list(dict.fromkeys(CRITICAL_TOKEN_RE.findall(source)))
    missing_tokens = [token for token in critical_tokens if _normalize(token) not in normalized_body]
    missing_polarity = [term for term in POLARITY_TERMS if term in source and term not in body]

    warnings: list[dict[str, Any]] = []
    if missing_tokens:
        warnings.append({
            "code": "CRITICAL_VALUE_MISSING",
            "message": "部分数值、单位或时间未在草稿中完整出现，请对照原材料核对。",
            "examples": missing_tokens[:6],
        })
    if missing_polarity:
        warnings.append({
            "code": "POLARITY_MISSING",
            "message": "部分否定或不确定表达未在草稿中完整保留，请重点核对。",
            "examples": missing_polarity[:6],
        })

    blueprint = (template or {}).get("writingBlueprint") or (template or {}).get("writing_blueprint") or {}
    length_policy = blueprint.get("lengthPolicy") if isinstance(blueprint, dict) else {}
    length_policy = length_policy if isinstance(length_policy, dict) else {}
    source_chars = _meaningful_length(source)
    body_chars = _meaningful_length(body)
    minimum_source_chars = int(length_policy.get("minimumSourceChars") or 0)
    minimum_body_chars = int(length_policy.get("minimumBodyChars") or 0)
    minimum_ratio = float(length_policy.get("minimumBodyToSourceRatio") or 0)
    expansion_ratio = round(body_chars / source_chars, 2) if source_chars else 0
    richness_thin = source_chars >= minimum_source_chars and (
        (minimum_ratio > 0 and expansion_ratio < minimum_ratio)
        or (minimum_body_chars > 0 and body_chars < minimum_body_chars)
    )

    contract = (template or {}).get("generationContract") or (template or {}).get("generation_contract") or {}
    sections = contract.get("sections") if isinstance(contract, dict) else []
    matched_sections = [section for section in (sections or []) if str(section) in body]

    return {
        "status": "needs_review" if warnings else "passed",
        "warnings": warnings,
        "sourceCharCount": source_chars,
        "bodyCharCount": body_chars,
        "expansionRatio": expansion_ratio,
        "richness": {
            "status": "thin" if richness_thin else "adequate",
            "minimumBodyChars": minimum_body_chars,
            "minimumBodyToSourceRatio": minimum_ratio,
        },
        "criticalTokenCount": len(critical_tokens),
        "matchedSectionCount": len(matched_sections),
        "contractSectionCount": len(sections or []),
    }
