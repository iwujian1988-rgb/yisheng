#!/usr/bin/env python
import json
import os
import sys


def is_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def normalize_box(box):
    if not isinstance(box, list):
        return []
    points = []
    for point in box:
        if isinstance(point, (list, tuple)) and len(point) >= 2:
            points.append([float(point[0]), float(point[1])])
    return points


def collect_lines(node, lines):
    if not isinstance(node, list):
        return

    if len(node) >= 2:
        box = node[0]
        text_score = node[1]
        if (
            isinstance(text_score, (list, tuple))
            and len(text_score) >= 2
            and isinstance(text_score[0], str)
            and is_number(text_score[1])
        ):
            lines.append({
                "text": text_score[0],
                "confidence": float(text_score[1]),
                "box": normalize_box(box),
            })
            return

    for item in node:
        collect_lines(item, lines)


def main():
    if len(sys.argv) < 2:
        raise SystemExit("usage: ocr_paddle_adapter.py <image_path>")

    image_path = sys.argv[1]
    if not os.path.exists(image_path):
        raise SystemExit("image file not found")

    from paddleocr import PaddleOCR

    lang = os.getenv("PADDLEOCR_LANG", "ch")
    use_textline_orientation = os.getenv("PADDLEOCR_USE_ANGLE_CLS", "true").lower() in ("1", "true", "yes")
    ocr_kwargs = {
        "lang": lang,
        "use_doc_orientation_classify": False,
        "use_doc_unwarping": False,
        "use_textline_orientation": use_textline_orientation,
    }
    ocr = PaddleOCR(**ocr_kwargs)
    result = ocr.predict(image_path)

    lines = []
    collect_lines(result, lines)
    text = "\n".join(line["text"] for line in lines if line["text"]).strip()
    confidence_values = [line["confidence"] for line in lines if is_number(line.get("confidence"))]
    confidence = sum(confidence_values) / len(confidence_values) if confidence_values else 0

    print(json.dumps({
        "text": text,
        "confidence": round(confidence, 4),
        "regions": lines,
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
