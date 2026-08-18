from __future__ import annotations

import re
from typing import Any


MARKER = "[[STRUCTURED_FACTS]]"
END_MARKER = "[[/STRUCTURED_FACTS]]"


def _clean(value: Any) -> str:
    return str(value if value is not None else "").strip()


def _loose(value: Any) -> str:
    return re.sub(r"[\W_]+", "", _clean(value), flags=re.UNICODE).lower()


def materialize_required_source_facts(
    body_text: str,
    required_facts: list[dict[str, Any]] | None,
    structured_facts: list[dict[str, Any]] | None = None,
) -> str:
    body = str(body_text or "").strip()
    normalized = _loose(body)
    source_scoped_keys = {"specimenType", "specimenNo", "testItems", "instrument", "applicationDoctor"}
    missing: list[dict[str, Any]] = []
    for fact in required_facts or []:
        if not isinstance(fact, dict) or not _clean(fact.get("value")):
            continue
        if str(fact.get("key") or "") not in source_scoped_keys:
            if _loose(fact.get("value")) not in normalized:
                missing.append(fact)
            continue
        source_index = int(fact.get("sourceIndex") or 0)
        source_label = f"报告表头补充（来源{source_index}）" if source_index else ""
        scoped_line = next((line for line in body.splitlines() if source_label and line.startswith(source_label)), "")
        if _loose(fact.get("value")) not in _loose(scoped_line):
            missing.append(fact)
    if not missing:
        return body
    diagnosis_facts = [
        fact for fact in missing
        if fact.get("certainty") == "preliminary" or "diagnosis" in str(fact.get("key") or "").lower()
    ]
    missing = [fact for fact in missing if fact not in diagnosis_facts]
    source_order: list[str] = []
    for fact in structured_facts or []:
        source_id = _clean(fact.get("sourceId")) or "source_unknown"
        if source_id not in source_order:
            source_order.append(source_id)
    grouped: dict[str, list[dict[str, Any]]] = {}
    for fact in missing:
        source_id = _clean(fact.get("sourceId")) or "source_unknown"
        grouped.setdefault(source_id, []).append(fact)
    lines: list[str] = []
    for source_id, source_facts in grouped.items():
        declared_index = int(source_facts[0].get("sourceIndex") or 0)
        source_number = declared_index or (source_order.index(source_id) + 1 if source_id in source_order else 0)
        source_label = f"来源{source_number}" if source_number else "对应来源"
        values = "；".join(
            f"{_clean(fact.get('label') or fact.get('key'))}：{_clean(fact.get('value'))}"
            for fact in source_facts
        )
        lines.append(f"报告表头补充（{source_label}）：{values}。")
    line = "\n".join(lines)
    lab_index = body.find("\n检验结果")
    if line:
        body = body[:lab_index] + "\n" + line + body[lab_index:] if lab_index >= 0 else body + "\n\n" + line
    if diagnosis_facts:
        diagnosis_lines = "\n".join(
            f"{'\u521d\u6b65\u8bca\u65ad' if fact.get('certainty') == 'preliminary' else _clean(fact.get('label') or fact.get('key'))}\uff1a{_clean(fact.get('value'))}\u3002"
            for fact in diagnosis_facts
        )
        heading = re.compile(r"(^|\n)(?:\u8bca\u65ad\u7ed3\u8bba|\u521d\u6b65\u8bca\u65ad|\u8bca\u65ad)\s*(?:\n|$)")
        if heading.search(body):
            body = heading.sub(lambda match: match.group(0) + diagnosis_lines + "\n", body, count=1)
        else:
            body += ("\n\n" if body else "") + "\u8bca\u65ad\u7ed3\u8bba\n" + diagnosis_lines
    return body.strip()


def render_structured_facts(facts: list[dict[str, Any]] | None) -> str:
    groups: list[dict[str, Any]] = []
    by_key: dict[str, dict[str, Any]] = {}
    for fact in facts or []:
        if not isinstance(fact, dict) or not fact.get("name") or not fact.get("result"):
            continue
        source_id = _clean(fact.get("sourceId")) or "source_unknown"
        date_value = _clean(fact.get("dateValue") or fact.get("reportDate"))
        date_label = _clean(fact.get("dateLabel")) or ("报告日期" if fact.get("reportDate") else "日期")
        key = f"{source_id}|{date_label}|{date_value}"
        if key not in by_key:
            by_key[key] = {"dateLabel": date_label, "dateValue": date_value, "facts": []}
            groups.append(by_key[key])
        by_key[key]["facts"].append(fact)
    if not groups:
        return ""
    lines = ["检验结果"]
    for group_index, group in enumerate(groups, start=1):
        date_value = group["dateValue"]
        lines.append(f"来源{group_index}（{group['dateLabel'] + '：' + date_value if date_value else '日期未提供'}）")
        for index, fact in enumerate(group["facts"], start=1):
            name = _clean(fact.get("name")).lstrip("*")
            code = _clean(fact.get("code"))
            label = name if not code or name.lower() == code.lower() else f"{name}（{code}）"
            result = _clean(fact.get("result"))
            if fact.get("unit"):
                result += " " + _clean(fact.get("unit"))
            details: list[str] = []
            if fact.get("referenceRange"):
                details.append("参考范围" + _clean(fact.get("referenceRange")))
            if fact.get("flag") == "high":
                details.append("↑")
            if fact.get("flag") == "low":
                details.append("↓")
            lines.append(f"{index}. {label}：{result}" + (f"（{'，'.join(details)}）" if details else ""))
    return "\n".join(lines)


def materialize_structured_facts(body_text: str, facts: list[dict[str, Any]] | None) -> str:
    body = str(body_text or "").strip()
    block = render_structured_facts(facts)
    if not block:
        return body.replace(MARKER, "").replace(END_MARKER, "").strip()
    start = body.find(MARKER)
    end = body.find(END_MARKER, start + len(MARKER)) if start >= 0 else -1
    if start >= 0 and end >= 0:
        before = body[:start].splitlines()
        risky = re.compile(r"(?:20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}|标本类型).*(?:检验|检查|化验|生化)|(?:检验|检查|化验|生化).*(?:20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}|标本类型)")
        while before and not before[-1].strip():
            before.pop()
        if before and risky.search(before[-1]):
            before.pop()
        while before and not before[-1].strip():
            before.pop()
        prefix = "\n".join(before) + ("\n" if before else "")
        return (prefix + block + body[end + len(END_MARKER):]).replace(MARKER, "").replace(END_MARKER, "").strip()
    if start >= 0:
        return body.replace(MARKER, block, 1).replace(MARKER, "").replace(END_MARKER, "").strip()
    return ((body + "\n\n") if body else "") + block
