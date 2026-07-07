from __future__ import annotations

from typing import Any


def _is_scalar_field(node: dict[str, Any]) -> bool:
    return isinstance(node, dict) and "type" in node and "label" in node


def _format_scalar_field(node: dict[str, Any], indent: str) -> str:
    label = str(node.get("label") or "")
    field_type = str(node.get("type") or "string")
    required = "必填" if node.get("is_required") else "选填"
    description = str(node.get("description") or "")
    line = f"{indent}- {label} ({field_type}, {required})"
    if description:
        line += f": {description}"
    items = node.get("items")
    if field_type == "array" and isinstance(items, dict):
        if items.get("type") == "string":
            return line
        line += "\n" + format_fields_schema(items, indent + "  ")
    return line


def format_fields_schema(fields: Any, indent: str = "") -> str:
    if isinstance(fields, list):
        lines: list[str] = []
        for field in fields:
            if not isinstance(field, dict):
                continue
            label = str(field.get("label") or field.get("key") or "")
            description = str(field.get("description") or "")
            lines.append(f"{indent}- {label}: {description}")
        return "\n".join(lines) if lines else "（无模板字段约束）"

    if not isinstance(fields, dict) or not fields:
        return "（无模板字段约束）"

    lines: list[str] = []
    for key, node in fields.items():
        if key.startswith("_") or not isinstance(node, dict):
            continue
        if _is_scalar_field(node):
            lines.append(_format_scalar_field(node, indent))
            continue
        module_label = str(node.get("_label") or key)
        lines.append(f"{indent}【{module_label}】")
        lines.append(format_fields_schema(node, indent + "  "))
    return "\n".join([line for line in lines if line])
