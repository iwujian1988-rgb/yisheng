#!/usr/bin/env python
import json
import os
import sys
import time


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")


def main():
    if len(sys.argv) < 2:
        raise SystemExit("usage: asr_faster_whisper_adapter.py <audio_path>")

    audio_path = sys.argv[1]
    if not os.path.exists(audio_path):
        raise SystemExit("audio file not found")

    from faster_whisper import WhisperModel

    model_name = os.getenv("FASTER_WHISPER_MODEL", "base")
    device = os.getenv("FASTER_WHISPER_DEVICE", "cpu")
    compute_type = os.getenv("FASTER_WHISPER_COMPUTE_TYPE", "int8")
    language = os.getenv("FASTER_WHISPER_LANGUAGE") or None

    started_at = time.time()
    model = WhisperModel(model_name, device=device, compute_type=compute_type)
    segments, info = model.transcribe(audio_path, language=language, vad_filter=True)

    parts = []
    confidences = []
    for segment in segments:
      text = (segment.text or "").strip()
      if text:
          parts.append(text)
      avg_logprob = getattr(segment, "avg_logprob", None)
      if isinstance(avg_logprob, (int, float)):
          confidences.append(max(0, min(1, 1 + float(avg_logprob))))

    duration = getattr(info, "duration", 0) or 0
    confidence = sum(confidences) / len(confidences) if confidences else 0

    print(json.dumps({
        "text": "\n".join(parts).strip(),
        "durationMs": int(duration * 1000),
        "confidence": round(confidence, 4),
        "elapsedMs": int((time.time() - started_at) * 1000),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
