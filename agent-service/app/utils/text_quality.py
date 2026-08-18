from __future__ import annotations

import re
from typing import Any


CRITICAL_TOKEN_RE = re.compile(
    r"\d+(?:\.\d+)?\s*(?:mmHg|mmol/L|μmol/L|mg/dL|ng/mL|IU/L|U/L|mL/min|kg|cm|mg|g|ml|mL|℃|°C|次/分|次/分钟|天|周|月|年|小时|分)",
    re.IGNORECASE,
)
POLARITY_TERMS = ("否认", "未见", "无", "没有", "疑似", "考虑", "待排", "可能", "不详", "未知")


def _normalize(value: str) -> str:
    return re.sub(r"\s+", "", str(value or "").replace("μ", "u")).lower()


def _normalize_loose(value: str) -> str:
    return re.sub(r"[\W_]+", "", _normalize(value), flags=re.UNICODE)


def _meaningful_length(value: str) -> int:
    return len(re.sub(r"[\s\W_]+", "", str(value or ""), flags=re.UNICODE))


def _section_has_content(body_text: str, section: str, sections: list[str]) -> bool:
    lines = str(body_text or "").splitlines()
    start = next((index for index, line in enumerate(lines) if line.strip().lstrip("#").strip() == section), -1)
    if start < 0:
        return False
    for line in lines[start + 1:]:
        normalized = line.strip().lstrip("#").strip()
        if normalized in sections:
            break
        if line.strip():
            return True
    return False


def format_quality_warning(warning: dict[str, Any]) -> str:
    message = str(warning.get("message") or "").strip()
    examples = [str(item).strip() for item in (warning.get("examples") or []) if str(item).strip()]
    return message + (" " + "；".join(examples) if examples else "")


def _source_blocks(source: str) -> list[dict[str, str]]:
    blocks = [
        {"source": match.group(1), "text": match.group(2)}
        for match in re.finditer(r"【([^】]+)】\s*\n([\s\S]*?)(?=\n\n【|$)", source)
    ]
    return blocks or [{"source": "输入材料", "text": source}]


def _confirmed_value(rule: dict[str, Any], confirmed_fields: list[dict[str, Any]]) -> str:
    for field in confirmed_fields:
        if not isinstance(field, dict):
            continue
        label = str(field.get("label") or "")
        key_parts = re.split(r"[._]", str(field.get("key") or "").lower())
        if rule["label"] in label or rule["key"] in key_parts:
            return str(field.get("value") or "").strip()
    return ""


def _source_conflicts(
    source: str,
    confirmed_fields: list[dict[str, Any]],
) -> dict[str, list[dict[str, Any]]]:
    conflicts: list[dict[str, Any]] = []
    resolved: list[dict[str, Any]] = []
    blocks = _source_blocks(source)
    rules = (
        {"key": "name", "label": "姓名", "pattern": r"(?:患者)?姓名\s*[:：]\s*([^\s，。；;\n【】]{1,20})"},
        {"key": "sex", "label": "性别", "pattern": r"性别\s*[:：]\s*([^\s，。；;\n【】]{1,8})"},
        {"key": "age", "label": "年龄", "pattern": r"年龄\s*[:：]\s*([^\s，。；;\n【】]{1,12})"},
        {"key": "record_id", "label": "患者编号", "pattern": r"(?:病案号|患者编号|门诊号|住院号)\s*[:：]\s*([^\s，。；;\n【】]{1,30})"},
    )
    for rule in rules:
        candidates: list[dict[str, str]] = []
        for block in blocks:
            for value in re.findall(rule["pattern"], block["text"]):
                candidate = {"value": value.strip(), "source": block["source"]}
                if candidate["value"] and candidate not in candidates:
                    candidates.append(candidate)
        values = list(dict.fromkeys(item["value"] for item in candidates))
        if len(values) > 1:
            adopted = _confirmed_value(rule, confirmed_fields)
            item = {"key": rule["key"], "label": rule["label"], "candidates": candidates}
            if adopted:
                resolved.append({**item, "adoptedValue": adopted})
            else:
                conflicts.append(item)

    aliases = {
        "wbc": "WBC", "白细胞计数": "WBC", "rbc": "RBC", "红细胞计数": "RBC",
        "hgb": "HGB", "hb": "HGB", "血红蛋白": "HGB", "plt": "PLT", "血小板计数": "PLT",
        "crp": "CRP", "c-反应蛋白": "CRP",
    }
    groups: dict[str, list[dict[str, Any]]] = {}
    metric_pattern = re.compile(
        r"(WBC|RBC|HGB|Hb|PLT|CRP|白细胞计数|红细胞计数|血红蛋白|血小板计数|C-反应蛋白)"
        r"\s*(?:\([^)]*\))?\s*[:：]?\s*[<＞>《]?\s*(\d+(?:\.\d+)?)",
        re.IGNORECASE,
    )
    for block in blocks:
        date_match = re.search(r"\b(20\d{2}[-/.]\d{1,2}[-/.]\d{1,2})\b", block["text"])
        if not date_match:
            continue
        date = re.sub(r"[/.]", "-", date_match.group(1))
        for match in metric_pattern.finditer(block["text"]):
            raw_metric = match.group(1)
            metric = aliases.get(raw_metric.lower()) or aliases.get(raw_metric) or raw_metric.upper()
            groups.setdefault(f"{date}|{metric}", []).append({
                "value": match.group(2),
                "source": block["source"],
                "correction": "人工纠正" in block["source"],
            })
    for group_key, candidates in groups.items():
        values = list(dict.fromkeys(item["value"] for item in candidates))
        if len(values) < 2:
            continue
        date, metric = group_key.split("|", 1)
        item = {"key": group_key, "label": f"{date} {metric}", "candidates": candidates}
        corrections = [candidate for candidate in candidates if candidate["correction"]]
        if corrections:
            resolved.append({**item, "adoptedValue": corrections[-1]["value"]})
        else:
            conflicts.append(item)
    return {"unresolved": conflicts, "resolved": resolved}


def _structured_fact_conflicts(facts: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    """Detect same-date, same-item tuple conflicts for every structured lab item.

    This intentionally uses the structured OCR result instead of a short list of
    common analytes, so TP/ALT and uncommon items receive the same protection as
    WBC/RBC. Different dates remain separate trend observations.
    """
    groups: dict[str, list[dict[str, Any]]] = {}
    for fact in facts or []:
        if not isinstance(fact, dict) or not str(fact.get("result") or "").strip():
            continue
        item_key = _normalize(fact.get("code") or fact.get("name") or "")
        item_key = re.sub(r"[^a-z0-9\u4e00-\u9fff]", "", item_key)
        date_type = str(fact.get("dateType") or ("report" if fact.get("reportDate") else "none"))
        date_value = str(fact.get("dateValue") or fact.get("reportDate") or "")
        groups.setdefault(f"{date_type}|{date_value}|{item_key}", []).append(fact)

    conflicts: list[dict[str, Any]] = []
    for entries in groups.values():
        signatures = {
            "|".join(_normalize(fact.get(key) or "") for key in ("result", "unit", "referenceRange", "flag"))
            for fact in entries
        }
        source_ids = {str(fact.get("sourceId") or "source_unknown") for fact in entries}
        if len(signatures) <= 1 or len(source_ids) <= 1:
            continue
        first = entries[0]
        conflicts.append({
            "type": "lab_tuple",
            "label": str(first.get("name") or first.get("code") or "检验项目"),
            "dateType": str(first.get("dateType") or ""),
            "dateValue": str(first.get("dateValue") or first.get("reportDate") or ""),
            "candidates": [
                {
                    "value": " | ".join(
                        str(fact.get(key) or "").strip()
                        for key in ("result", "unit", "referenceRange", "flag")
                        if str(fact.get(key) or "").strip()
                    ),
                    "source": str(fact.get("sourceId") or "source_unknown"),
                    "factId": fact.get("factId"),
                }
                for fact in entries
            ],
        })
    return conflicts


def assess_text_quality(
    source_text: str,
    body_text: str,
    template: dict[str, Any] | None = None,
    confirmed_fields: list[dict[str, Any]] | None = None,
    structured_facts: list[dict[str, Any]] | None = None,
    required_source_facts: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    source = str(source_text or "")
    body = str(body_text or "")
    normalized_body = _normalize(body)
    normalized_body_loose = _normalize_loose(body)
    hard_errors: list[dict[str, Any]] = []
    for fact in required_source_facts or []:
        if not isinstance(fact, dict):
            continue
        value = str(fact.get("value") or "").strip()
        source_scoped = str(fact.get("key") or "") in {"specimenType", "specimenNo", "testItems", "instrument", "applicationDoctor"}
        source_index = int(fact.get("sourceIndex") or 0)
        source_label = f"报告表头补充（来源{source_index}）" if source_index else ""
        scoped_line = next((line for line in body.splitlines() if source_label and line.startswith(source_label)), "")
        value_missing = _normalize_loose(value) not in (_normalize_loose(scoped_line) if source_scoped else normalized_body_loose)
        if value and value_missing:
            hard_errors.append({
                "code": "SOURCE_HEADER_FACT_MISSING",
                "key": str(fact.get("key") or ""),
                "label": str(fact.get("label") or fact.get("key") or "报告表头事实"),
                "value": value,
                "sourceId": str(fact.get("sourceId") or ""),
                "message": "报告表头中的明确事实未写入正文：" + str(fact.get("label") or fact.get("key") or ""),
            })
    used_fact_ids: list[str] = []
    source_ids = list(dict.fromkeys(str(fact.get("sourceId") or "source_unknown") for fact in (structured_facts or []) if isinstance(fact, dict)))
    for fact in structured_facts or []:
        if not isinstance(fact, dict) or not fact.get("factId") or not fact.get("name") or not fact.get("result"):
            continue
        name = str(fact.get("name") or "")
        source_number = source_ids.index(str(fact.get("sourceId") or "source_unknown")) + 1
        source_marker = f"来源{source_number}（"
        source_start = body.find(source_marker)
        next_source_start = body.find(f"来源{source_number + 1}（", source_start + len(source_marker)) if source_start >= 0 else -1
        searchable_start = source_start if source_start >= 0 else 0
        searchable_end = next_source_start if next_source_start >= 0 else len(body)
        searchable_body = body[searchable_start:searchable_end]
        code = str(fact.get("code") or "").strip()
        clean_name = name.lstrip("*").strip()
        exact_label = f"{clean_name}（{code}）" if code and clean_name.lower() != code.lower() else clean_name
        position = -1
        segment = ""
        offset = 0
        for line in searchable_body.split("\n"):
            content = re.sub(r"^\s*\d+\.\s*", "", line)
            if content.startswith(exact_label + "："):
                segment = line
                position = searchable_start + offset + line.find(exact_label)
                break
            offset += len(line) + 1
        if position < 0:
            hard_errors.append({"code": "LAB_FACT_MISSING", "factId": fact.get("factId"), "sourceId": fact.get("sourceId"), "message": f"检验项目未写入结果：{name}"})
            continue
        missing = [key for key in ("result", "unit", "referenceRange") if fact.get(key) and _normalize(str(fact.get(key))) not in _normalize(segment)]
        if missing:
            hard_errors.append({"code": "LAB_TUPLE_BROKEN", "factId": fact.get("factId"), "sourceId": fact.get("sourceId"), "missing": missing, "message": f"检验项目与结果信息未保持绑定：{name}"})
            continue
        flag = str(fact.get("flag") or "")
        if flag == "high" and not re.search(r"[↑▲]|升高|偏高|高于", segment):
            hard_errors.append({"code": "LAB_FLAG_MISSING", "factId": fact.get("factId"), "sourceId": fact.get("sourceId"), "message": f"异常升高标志遗漏：{name}"})
            continue
        if flag == "low" and not re.search(r"[↓▼]|降低|偏低|低于", segment):
            hard_errors.append({"code": "LAB_FLAG_MISSING", "factId": fact.get("factId"), "sourceId": fact.get("sourceId"), "message": f"异常降低标志遗漏：{name}"})
            continue
        report_date = str(fact.get("dateValue") or fact.get("reportDate") or "")
        date_label = str(fact.get("dateLabel") or ("报告日期" if fact.get("reportDate") else ""))
        heading_position = body.rfind("来源", 0, position + 1)
        date_context = body[max(0, heading_position): position + 1]
        if report_date and (_normalize(report_date) not in _normalize(date_context) or (date_label and _normalize(date_label) not in _normalize(date_context))):
            hard_errors.append({"code": "LAB_DATE_MISSING", "factId": fact.get("factId"), "sourceId": fact.get("sourceId"), "message": f"报告日期未与检验事实一起保留：{name}"})
            continue
        if not report_date and not re.search(r"日期未提供|日期不详|报告日期未提供", date_context):
            hard_errors.append({"code": "LAB_DATE_SOURCE_MISMATCH", "factId": fact.get("factId"), "sourceId": fact.get("sourceId"), "message": f"无日期报告被错误关联日期：{name}"})
            continue
        used_fact_ids.append(str(fact.get("factId")))

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
    missing_confirmed_fields = []
    for field in confirmed_fields or []:
        if not isinstance(field, dict):
            continue
        value = str(field.get("value") or "").strip()
        if value and _normalize(value) not in normalized_body:
            missing_confirmed_fields.append(str(field.get("label") or field.get("key") or "已确认字段"))
    if missing_confirmed_fields:
        warnings.append({
            "code": "CONFIRMED_FIELD_MISSING",
            "message": "部分用户已确认字段未出现在草稿中，请核对后重新生成。",
            "examples": missing_confirmed_fields[:6],
        })
    conflict_review = _source_conflicts(source, confirmed_fields or [])
    source_conflicts = conflict_review["unresolved"] + _structured_fact_conflicts(structured_facts)
    if source_conflicts:
        warnings.append({
            "code": "SOURCE_CONFLICT",
            "message": "不同材料中的关键事实存在冲突，未确认前不得合并为同一事实。",
            "examples": [
                f"{item['label']}："
                + " / ".join(f"{candidate['value']}（{candidate['source']}）" for candidate in item["candidates"])
                for item in source_conflicts[:6]
            ],
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
    section_names = [str(section) for section in (sections or [])]
    matched_sections = [section for section in section_names if _section_has_content(body, section, section_names)]
    missing_sections = [section for section in section_names if section not in matched_sections]

    return {
        "status": "needs_review" if hard_errors or warnings else "passed",
        "hardErrors": hard_errors,
        "usedFactIds": used_fact_ids,
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
        "matchedSections": matched_sections,
        "missingSections": missing_sections,
        "missingConfirmedFields": missing_confirmed_fields,
        "sourceConflicts": source_conflicts,
        "resolvedSourceConflicts": conflict_review["resolved"],
    }
