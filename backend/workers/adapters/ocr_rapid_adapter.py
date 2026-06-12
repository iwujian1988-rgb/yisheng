#!/usr/bin/env python
import json
import os
import sys


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")


def is_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def normalize_box(box):
    if not isinstance(box, (list, tuple)):
        return []
    points = []
    for point in box:
        if isinstance(point, (list, tuple)) and len(point) >= 2:
            points.append([float(point[0]), float(point[1])])
    return points


def line_from_sequence(item):
    if not isinstance(item, (list, tuple)) or len(item) < 3:
        return None

    box = item[0]
    text = item[1]
    score = item[2]
    if not isinstance(text, str) or not is_number(score):
        return None

    return {
        "text": text,
        "confidence": float(score),
        "box": normalize_box(box),
    }


def lines_from_output(output):
    if hasattr(output, "txts"):
        txts = list(getattr(output, "txts") or [])
        scores = list(getattr(output, "scores", []) or [])
        boxes = list(getattr(output, "boxes", []) or [])
        lines = []
        for index, text in enumerate(txts):
            score = scores[index] if index < len(scores) and is_number(scores[index]) else 0
            box = boxes[index] if index < len(boxes) else []
            lines.append({
                "text": str(text),
                "confidence": float(score),
                "box": normalize_box(box),
            })
        return lines

    if isinstance(output, tuple) and output:
        return lines_from_output(output[0])

    if isinstance(output, list):
        lines = []
        for item in output:
            line = line_from_sequence(item)
            if line:
                lines.append(line)
        return lines

    return []


def load_engine():
    try:
        from rapidocr import RapidOCR
        return RapidOCR()
    except Exception:
        from rapidocr_onnxruntime import RapidOCR
        return RapidOCR()


def main():
    if len(sys.argv) < 2:
        raise SystemExit("usage: ocr_rapid_adapter.py <image_path>")

    image_path = sys.argv[1]
    if not os.path.exists(image_path):
        raise SystemExit("image file not found")

    engine = load_engine()
    output = engine(image_path)
    lines = lines_from_output(output)
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
