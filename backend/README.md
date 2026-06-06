# Text Transfer Backend

Aliyun-ready backend API for a general text transfer mini program.

Current scope:
- Mini program API gateway.
- Admin login and role-aware admin API.
- Service opening, device binding, template management, feedback, protected history, and audit-log endpoints.
- OCR/ASR/AI gateways. OCR defaults to a self-hosted free PaddleOCR or RapidOCR worker, not a paid cloud OCR product.

Run locally:

```bash
cd backend
node src/server.js
```

Health check:

```bash
curl http://localhost:8080/api/health
```

Smoke test:

```bash
cd backend
npm run smoke
```

Optional worker checks:

```bash
npm run worker:ocr
npm run worker:asr
```

Important:
- The default local repository writes to `backend/data/store.json` for local integration testing.
- Production should replace the file store with MySQL/RDS repositories using `db/schema.sql`.
- Admin APIs must never return plaintext user content.
- OCR/ASR/AI provider calls must not log raw user text.
- Professional templates are unlocked only by device/template permission, not by public UI text.

Provider worker configuration:

```bash
AI_PROVIDER=openai-compatible
AI_BASE_URL=https://your-ai-gateway.example.com
AI_API_KEY=your-provider-key
AI_MODEL=your-chat-model
OCR_ENGINE=paddleocr
OCR_WORKER_URL=http://127.0.0.1:9001/recognize
ASR_ENGINE=faster-whisper
ASR_WORKER_URL=http://127.0.0.1:9002/transcribe
```

AI gateway behavior:

- When `AI_API_KEY` is configured, `/api/ai/assistant` calls an OpenAI-compatible chat completions endpoint.
- When `AI_API_KEY` is empty, the gateway returns a deterministic local fallback with `status: not_configured`.
- AI output is normalized to two sections: `【正文】` and `【待确认】`.
- The gateway must not log raw user text.

Expected OCR worker request:

```json
{ "imageBase64": "...", "source": "mini_program" }
```

Expected OCR worker response:

```json
{ "provider": "paddleocr", "text": "...", "confidence": 0.93 }
```

The repository includes `workers/ocr-worker.example.js` as a stable HTTP wrapper. Replace `recognizeWithFreeEngine()` with PaddleOCR/RapidOCR invocation on Aliyun.

Expected ASR worker request:

```json
{ "audioBase64": "...", "format": "mp3", "source": "mini_program" }
```

Expected ASR worker response:

```json
{ "provider": "faster-whisper", "text": "...", "durationMs": 12000, "confidence": 0.9 }
```

The repository includes `workers/asr-worker.example.js` as a stable HTTP wrapper. Replace `transcribeWithFreeEngine()` with faster-whisper invocation if voice input is required.
