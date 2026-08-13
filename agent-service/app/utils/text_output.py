from __future__ import annotations

import re


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
