# OCR And ASR Architecture

## 1. Core Boundary

OCR and ASR are not implemented directly inside pages. Pages only:

- Select image or record audio.
- Call service-layer entrypoints.
- Display result or service error.
- Let the user confirm before sending to the home transfer flow.

Current modules:

```text
services/ocr/recognizer.js
services/asr/transcriber.js
services/api/client.js
```

## 2. Provider Strategy

Mini program code does not hold OCR/ASR provider credentials.

Provider behavior:

- If `app.globalData.baseUrl` is empty, OCR/ASR return `OCR_NOT_CONFIGURED` or `ASR_NOT_CONFIGURED`.
- If `baseUrl` exists, OCR uploads image to `/api/ocr/recognize`.
- If `baseUrl` exists, ASR uploads audio to `/api/asr/transcribe`.
- Backend is responsible for provider selection, retry, cost control, logs and model deployment.

## 3. OCR Direction

Preferred backend-side open-source candidates:

- PaddleOCR
- RapidOCR
- Tesseract only as fallback for simpler text

Evaluation priorities:

- Chinese recognition quality.
- Stable deployment cost.
- Image upload size and latency.
- Ability to return confidence and regions.

## 4. ASR Direction

Preferred backend-side candidates:

- faster-whisper
- whisper.cpp service
- other deployable open-source ASR services after evaluation

Evaluation priorities:

- Chinese transcription quality.
- Medical term handling.
- Latency for short dictation.
- Deployment cost on target server.

## 5. Security Boundary

OCR/ASR raw output must not go directly into third-party AI.

Required flow:

```text
OCR/ASR output
-> user confirmation
-> services/security/content-guard.prepareTextForThirdPartyAi()
-> AI gateway if AI processing is needed
-> protected history storage if saved
```

Forbidden:

- Page-level OCR/ASR mock text.
- Logging raw OCR/ASR medical text.
- Sending unredacted OCR/ASR output to DeepSeek.
- Storing real patient samples in tests.

## 6. Remaining Work

- Select final OCR provider.
- Select final ASR provider.
- Backend upload size limits.
- Backend file retention policy.
- OCR/ASR result confidence display.
- OCR/ASR usage metrics.
