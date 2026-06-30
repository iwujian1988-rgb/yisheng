from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class SourceItem:
    index: int
    text: str

    def to_dict(self) -> dict[str, Any]:
        return {"index": self.index, "text": self.text}


@dataclass
class AgentSources:
    ocr: list[SourceItem] = field(default_factory=list)
    asr: list[SourceItem] = field(default_factory=list)
    pasted_text: str = ""

    def has_content(self) -> bool:
        return bool(self.ocr or self.asr or self.pasted_text.strip())

    def to_dict(self) -> dict[str, Any]:
        return {
            "ocr": [item.to_dict() for item in self.ocr],
            "asr": [item.to_dict() for item in self.asr],
            "pastedText": self.pasted_text,
        }

    def preview_dict(self, max_chars: int = 2000) -> dict[str, Any]:
        data = self.to_dict()
        remaining = max_chars
        for key in ("ocr", "asr"):
            items = data.get(key) or []
            for item in items:
                text = str(item.get("text") or "")
                if len(text) > remaining:
                    item["text"] = text[:remaining] + "…"
                    remaining = 0
                else:
                    remaining -= len(text)
        pasted = str(data.get("pastedText") or "")
        if len(pasted) > remaining:
            data["pastedText"] = pasted[:remaining] + "…"
        return data

    def texts_for_keys(self, keys: list[str]) -> list[str]:
        chunks: list[str] = []
        normalized = [str(key).lower() for key in keys]
        if not normalized:
            normalized = ["ocr", "asr", "pasted"]
        if "ocr" in normalized:
            chunks.extend(item.text for item in self.ocr if item.text)
        if "asr" in normalized:
            chunks.extend(item.text for item in self.asr if item.text)
        if "pasted" in normalized and self.pasted_text.strip():
            chunks.append(self.pasted_text.strip())
        return chunks

    def combined_text(self, source_priority: list[str] | None = None) -> str:
        keys = source_priority or ["ocr", "asr", "pasted"]
        return "\n\n".join(self.texts_for_keys(keys)).strip()

    @classmethod
    def from_dict(cls, data: dict[str, Any] | None) -> AgentSources:
        if not isinstance(data, dict):
            return cls()
        ocr = [
            SourceItem(index=int(item.get("index") or idx + 1), text=str(item.get("text") or ""))
            for idx, item in enumerate(data.get("ocr") or [])
            if isinstance(item, dict)
        ]
        asr = [
            SourceItem(index=int(item.get("index") or idx + 1), text=str(item.get("text") or ""))
            for idx, item in enumerate(data.get("asr") or [])
            if isinstance(item, dict)
        ]
        pasted = str(data.get("pastedText") or data.get("pasted_text") or "")
        return cls(ocr=ocr, asr=asr, pasted_text=pasted)


def template_plan_summary(template: dict[str, Any] | None) -> dict[str, Any] | None:
    if not template:
        return None
    fields = template.get("fields") if isinstance(template.get("fields"), list) else []
    labels = [str(f.get("label") or f.get("key") or "") for f in fields if isinstance(f, dict)]
    return {
        "id": template.get("id") or "",
        "name": template.get("name") or "",
        "templateType": template.get("template_type") or template.get("templateType") or "",
        "fieldLabels": [label for label in labels if label],
    }


def format_sources_block(sources: AgentSources, title: str = "源材料") -> str:
    parts: list[str] = [f"【{title}】"]
    for item in sources.ocr:
        parts.append(f"OCR-{item.index}：\n{item.text}")
    for item in sources.asr:
        parts.append(f"ASR-{item.index}：\n{item.text}")
    if sources.pasted_text.strip():
        parts.append(f"粘贴文本：\n{sources.pasted_text.strip()}")
    return "\n\n".join(parts).strip()


def format_context_history_item(item: dict[str, Any]) -> str:
    if item.get("role") != "context" or item.get("kind") != "sources":
        return ""
    storage = str(item.get("storage") or "summary")
    label = "历史源材料-全文" if storage == "full" else "历史源材料-摘要"
    sources = AgentSources.from_dict(item.get("sources") if isinstance(item.get("sources"), dict) else item)
    if not sources.has_content():
        return ""
    return format_sources_block(sources, label)


def merge_histories(client_history: list[dict[str, Any]], server_history: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not server_history:
        return list(client_history)
    if not client_history:
        return list(server_history)

    server_contexts = [item for item in server_history if item.get("role") == "context"]
    if not server_contexts:
        return list(client_history)

    client_dialog = [item for item in client_history if item.get("role") in ("user", "assistant")]
    if not client_dialog:
        return list(server_history)

    merged: list[dict[str, Any]] = []
    context_idx = 0
    for item in client_dialog:
        merged.append(item)
        if item.get("role") == "assistant" and context_idx < len(server_contexts):
            merged.append(server_contexts[context_idx])
            context_idx += 1
    while context_idx < len(server_contexts):
        merged.append(server_contexts[context_idx])
        context_idx += 1
    return merged


def normalize_source_priority(value: Any, sources: AgentSources) -> list[str]:
    if isinstance(value, list) and value:
        return [str(item).lower() for item in value]
    keys: list[str] = []
    if sources.ocr:
        keys.append("ocr")
    if sources.asr:
        keys.append("asr")
    if sources.pasted_text.strip():
        keys.append("pasted")
    return keys or ["ocr", "asr", "pasted"]
