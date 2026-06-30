from __future__ import annotations

import re


def split_sectioned_output(text: str) -> dict[str, str | list[str]]:
    value = str(text or "").strip()
    body_marker = "【正文】"
    confirm_marker = "【待确认】"

    if body_marker not in value and confirm_marker not in value:
        return {
            "result_text": value,
            "body_text": value,
            "confirm_items": [],
        }

    body_start = value.find(body_marker)
    confirm_start = value.find(confirm_marker)

    if confirm_start >= 0:
        body_text = value[
            body_start + len(body_marker) if body_start >= 0 else 0 : confirm_start
        ].strip()
        confirm_raw = value[confirm_start + len(confirm_marker) :].strip()
    else:
        body_text = value.replace(body_marker, "").strip()
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
