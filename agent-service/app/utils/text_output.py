from __future__ import annotations

import re


UNAVAILABLE_RE = re.compile(r"未提供|未明确|不详|待补充|暂无|无法确认|暂不列出|无明确")
JUDGMENT_SOURCE_PATTERNS = {
    "初步诊断": re.compile(r"(?:初步|入院|出院|临床|主要|明确)?诊断\s*[:：为]|诊断为|考虑|拟诊"),
    "诊断结论": re.compile(r"(?:初步|入院|出院|临床|主要|明确)?诊断\s*[:：为]|诊断为|考虑|拟诊"),
    "诊断依据": re.compile(r"诊断依据|依据[^\n。；;]{0,80}(?:诊断|考虑)"),
    "鉴别诊断": re.compile(r"鉴别诊断|需与[^\n。；;]{0,80}鉴别|排除|除外"),
}


def remove_resolved_identity_questions(items: list[str], confirmed_fields: list[dict] | None) -> list[str]:
    has_confirmed_name = any(
        str(field.get("value") or "").strip()
        and (
            "name" in re.split(r"[._]", str(field.get("key") or "").lower())
            or "\u59d3\u540d" in str(field.get("label") or "")
        )
        for field in (confirmed_fields or [])
        if isinstance(field, dict)
    )
    if not has_confirmed_name:
        return items
    pattern = re.compile(r"(\u59d3\u540d.{0,30}\u4e0d\u4e00\u81f4|\u540c\u4e00\u60a3\u8005|\u662f\u5426\u5c5e\u4e8e\u540c\u4e00|\u6838\u5b9e\u662f\u5426\u4e3a\u540c\u4e00|\u662f\u5426\u5747\u5c5e\u4e8e.{0,20}\u672c\u4eba)")
    return [item for item in items if not pattern.search(str(item or ""))]


def keep_actionable_confirm_items(items: list[str], maximum: int = 3) -> list[str]:
    pattern = re.compile(r"(\u8bf7|\u662f\u5426|\u9700|\u6838\u5bf9|\u8865\u5145|\u66f4\u6b63|\u9009\u62e9|\u786e\u8ba4)")
    return [item for item in items if pattern.search(str(item or ""))][:maximum]


def filter_resolved_grounding_errors(
    errors: list[dict] | None,
    body_text: str,
    required_facts: list[dict] | None,
) -> list[dict]:
    body = str(body_text or "")
    preliminary_values = [
        str(fact.get("value") or "").strip()
        for fact in (required_facts or [])
        if isinstance(fact, dict) and fact.get("certainty") == "preliminary" and str(fact.get("value") or "").strip()
    ]
    result: list[dict] = []
    for error in errors or []:
        if not isinstance(error, dict) or error.get("category") != "diagnosis":
            result.append(error)
            continue
        resolved = any(
            (exact := f"\u521d\u6b65\u8bca\u65ad\uff1a{value}") in body and exact in str(error.get("fragment") or "")
            for value in preliminary_values
        )
        if not resolved:
            result.append(error)
    return result


def remove_unavailable_template_sections(body_text: str, template: dict | None) -> str:
    body = str(body_text or "").strip()
    contract = (template or {}).get("generationContract") or (template or {}).get("generation_contract") or {}
    sections = [str(item).strip() for item in (contract.get("sections") or []) if str(item).strip()]
    if not body or not sections:
        return body
    current_heading = ""
    lines: list[str] = []
    for raw_line in body.splitlines():
        possible_heading = raw_line.strip().lstrip("#").strip()
        if possible_heading in semantic_boundaries:
            current_heading = possible_heading
            lines.append(raw_line)
            continue
        if "\u8bca\u65ad" in current_heading:
            lines.append(raw_line)
            continue
        cleaned = raw_line
        for value in diagnosis_values:
            cleaned = re.sub(
                rf"(?:\u521d\u6b65\u8bca\u65ad|\u8bca\u65ad\u7ed3\u8bba|\u8bca\u65ad)\s*[:\uff1a]?\s*{re.escape(value)}[\u3002\uff1b;]?",
                "",
                cleaned,
            )
        lines.append(cleaned.strip())
    result: list[str] = []
    index = 0
    while index < len(lines):
        heading = lines[index].strip().lstrip("#").strip()
        if heading not in sections:
            result.append(lines[index])
            index += 1
            continue
        end = index + 1
        while end < len(lines) and lines[end].strip().lstrip("#").strip() not in sections:
            end += 1
        content_lines = [line.strip() for line in lines[index + 1:end] if line.strip()]
        unavailable_only = bool(content_lines) and all(UNAVAILABLE_RE.search(line) for line in content_lines)
        if not content_lines or unavailable_only:
            index = end
            continue
        result.extend(lines[index:end])
        index = end
    return "\n".join(result).strip()


def remove_unsupported_judgment_sections(body_text: str, source_text: str, template: dict | None) -> str:
    body = str(body_text or "").strip()
    source = str(source_text or "")
    contract = (template or {}).get("generationContract") or (template or {}).get("generation_contract") or {}
    sections = [str(item).strip() for item in (contract.get("sections") or []) if str(item).strip()]
    guarded = {heading: pattern for heading, pattern in JUDGMENT_SOURCE_PATTERNS.items() if heading in sections and not pattern.search(source)}
    if not body or not guarded:
        return body
    lines = body.splitlines()
    result: list[str] = []
    index = 0
    while index < len(lines):
        heading = lines[index].strip().lstrip("#").strip()
        if heading not in guarded:
            result.append(lines[index])
            index += 1
            continue
        index += 1
        while index < len(lines) and lines[index].strip().lstrip("#").strip() not in sections:
            index += 1
    return "\n".join(result).strip()


def remove_misplaced_report_facts(
    body_text: str,
    required_facts: list[dict] | None,
    template: dict | None,
) -> str:
    body = str(body_text or "").strip()
    contract = (template or {}).get("generationContract") or (template or {}).get("generation_contract") or {}
    sections = [str(item).strip() for item in (contract.get("sections") or []) if str(item).strip()]
    if not body or not sections:
        return body
    narrative_headings = {
        "\u4e3b\u8bc9", "\u73b0\u75c5\u53f2", "\u65e2\u5f80\u53f2", "\u4e2a\u4eba\u53f2",
        "\u5bb6\u65cf\u53f2", "\u4e2a\u4eba\u53f2\u3001\u5a5a\u80b2\u53f2\u4e0e\u5bb6\u65cf\u53f2",
        "\u4f53\u683c\u68c0\u67e5", "\u4e13\u79d1\u68c0\u67e5",
    }
    semantic_boundaries = set(sections) | {
        "\u4e00\u822c\u8d44\u6599", "\u4e3b\u8bc9", "\u73b0\u75c5\u53f2", "\u65e2\u5f80\u53f2",
        "\u4e2a\u4eba\u53f2", "\u5bb6\u65cf\u53f2", "\u4f53\u683c\u68c0\u67e5", "\u4e13\u79d1\u68c0\u67e5",
        "\u8f85\u52a9\u68c0\u67e5", "\u4e13\u79d1\u68c0\u67e5\u4e0e\u8f85\u52a9\u68c0\u67e5",
        "\u8bca\u65ad\u7ed3\u8bba", "\u521d\u6b65\u8bca\u65ad",
    }
    diagnosis_values = [
        str(fact.get("value") or "").strip()
        for fact in (required_facts or [])
        if isinstance(fact, dict)
        and str(fact.get("value") or "").strip()
        and (fact.get("certainty") == "preliminary" or "diagnosis" in str(fact.get("key") or "").lower())
    ]
    metadata_pattern = re.compile(r"(?:\u7533\u8bf7\u65e5\u671f|\u6807\u672c(?:\u7c7b\u578b|\u53f7)?|\u68c0\u9a8c\u4eea\u5668|\u68c0\u67e5\u9879\u76ee|\u68c0\u9a8c\u9879\u76ee)")
    lines = body.splitlines()
    result: list[str] = []
    index = 0
    while index < len(lines):
        heading = lines[index].strip().lstrip("#").strip()
        if heading not in narrative_headings:
            result.append(lines[index])
            index += 1
            continue
        end = index + 1
        while end < len(lines) and lines[end].strip().lstrip("#").strip() not in semantic_boundaries:
            end += 1
        kept: list[str] = []
        for line in lines[index + 1:end]:
            text = str(line or "").strip()
            if not text:
                continue
            compact = re.sub(r"[\W_]+", "", text, flags=re.UNICODE)
            diagnosis_only = False
            for value in diagnosis_values:
                normalized_value = re.sub(r"[\W_]+", "", value, flags=re.UNICODE)
                if normalized_value and normalized_value in compact:
                    remainder = compact.replace(normalized_value, "")
                    remainder = re.sub(r"(?:\u521d\u6b65|\u8bca\u65ad|\u8003\u8651|\u4e3a)", "", remainder)
                    if len(remainder) <= 4:
                        diagnosis_only = True
                        break
            diagnosis_misplaced = heading == "\u4e3b\u8bc9" and any(
                re.sub(r"[\W_]+", "", value, flags=re.UNICODE) in compact
                for value in diagnosis_values
                if re.sub(r"[\W_]+", "", value, flags=re.UNICODE)
            )
            metadata_terms = metadata_pattern.findall(text)
            report_metadata_only = len(metadata_terms) >= 2 or (
                len(metadata_terms) >= 1 and re.search(r"(?:\u672c\u6b21\u68c0\u9a8c|\u751f\u5316|\u8840\u6e05|AU\d+)", text, re.IGNORECASE)
            )
            unavailable_only = re.search(r"(?:\u65e0\u76f8\u5173.{0,12}\u6750\u6599|\u672a\u63d0\u4f9b|\u4e0d\u8be6|\u5f85\u8865\u5145)", text)
            if not diagnosis_only and not diagnosis_misplaced and not report_metadata_only and not unavailable_only:
                kept.append(line)
        if kept:
            result.extend([lines[index], *kept])
        index = end
    return re.sub(r"\n{3,}", "\n\n", "\n".join(result)).strip()


def split_sectioned_output(text: str) -> dict[str, str | list[str]]:
    value = str(text or "").strip()
    body_match = re.search(
        r"^[ \t]*(?:#+[ \t]*)?(?:【[ \t]*正文[ \t]*】|正文[：:])[ \t]*",
        value,
        re.MULTILINE,
    )
    confirm_match = re.search(
        r"^[ \t]*(?:#+[ \t]*)?(?:【[ \t]*待确认(?:事项)?[ \t]*】|待确认(?:事项)?[：:])[ \t]*",
        value,
        re.MULTILINE,
    )

    if not body_match and not confirm_match:
        return {
            "result_text": value,
            "body_text": value,
            "confirm_items": [],
        }

    body_start = body_match.end() if body_match else 0
    if confirm_match:
        body_text = value[body_start : confirm_match.start()].strip()
        confirm_raw = value[confirm_match.end() :].strip()
    else:
        body_text = value[body_start:].strip()
        confirm_raw = ""

    confirm_items = [
        line.strip().lstrip("0123456789.-、)）. ")
        for line in confirm_raw.splitlines()
        if line.strip()
    ]

    return {
        "result_text": value,
        "body_text": body_text,
        "confirm_items": confirm_items,
    }
