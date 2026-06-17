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

Full release gate:

```bash
cd ..
npm run release:check
```

Optional worker checks:

```bash
npm run worker:ocr
npm run worker:asr
```

Important:
- The default local repository writes to `backend/data/store.json` for local integration testing.
- Production should replace the file store with MySQL/RDS repositories using `db/schema.sql`.
- `NODE_ENV=production` rejects `STORE_MODE=file` by default. Use `ALLOW_FILE_STORE_IN_PRODUCTION=true` only for a controlled pilot with backups.
- Production rejects unknown device binding by default. Preload devices through the admin flow and store only a hashed proofCode.
- Admin APIs must never return plaintext user content.
- OCR/ASR/AI provider calls must not log raw user text.
- Professional templates are unlocked only by device/template permission, not by public UI text.

Provider worker configuration:

```bash
DASHSCOPE_API_KEY=your-dashscope-key
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com
OCR_CLOUD_MODEL=qwen-vl-ocr-2025-11-20
OCR_CLOUD_TASK=text_recognition
AI_PROVIDER=openai-compatible
AI_BASE_URL=https://your-ai-gateway.example.com
AI_API_KEY=your-provider-key
AI_MODEL=your-chat-model
OCR_ENGINE=paddleocr
OCR_WORKER_URL=
OCR_TIMEOUT_MS=30000
OCR_MAX_IMAGE_BYTES=5242880
ASR_ENGINE=faster-whisper
ASR_CLOUD_MODEL=qwen3-asr-flash
ASR_WORKER_URL=
ASR_TIMEOUT_MS=60000
ASR_MAX_AUDIO_BYTES=20971520
ALLOW_UNKNOWN_DEVICE_BINDING=false
```

OCR cloud behavior:

- When `DASHSCOPE_API_KEY` is configured, `/api/ocr/recognize` calls DashScope QwenVL-OCR (`qwen-vl-ocr-2025-11-20` by default).
- When the key is empty, the gateway falls back to `OCR_WORKER_URL` if set, otherwise returns `status: not_configured`.
- The same `DASHSCOPE_API_KEY` is also used for cloud ASR when `ASR_WORKER_URL` is empty.

Device pilot flow:

- Register a pilot device with `POST /api/admin/devices`.
- Body fields: `serialNo`, optional `templateAccess`, `proofCode`, `reservedUserId`, `model`, `firmwareVersion`, `protocolVersion`.
- Batch register devices with `POST /api/admin/devices/import`, using either `devices` JSON array or `devicesText` CSV with headers such as `serialNo,templateAccess,proofCode,model`.
- The backend stores `proofCode` as `proofCodeHash` and never returns the hash in public/admin responses.
- Users bind through `/api/devices/bind` with `serialNo + proofCode`.

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

The repository includes `workers/ocr-worker.example.js` as a stable HTTP wrapper. It can call a deployed PaddleOCR/RapidOCR command without changing the API contract:

```bash
OCR_ENGINE=paddleocr
OCR_COMMAND=python
OCR_COMMAND_ARGS='["backend/workers/adapters/ocr_paddle_adapter.py","{input}"]'
node workers/ocr-worker.example.js
```

`OCR_COMMAND` should print either plain recognized text or JSON such as `{"text":"...","confidence":0.93,"regions":[]}`. The worker writes the uploaded image to a temporary file, passes the path as `{input}`, then deletes the temporary file.

See `workers/adapters/README.md` for PaddleOCR and RapidOCR command examples.

Expected ASR worker request:

```json
{ "audioBase64": "...", "format": "mp3", "source": "mini_program" }
```

Expected ASR worker response:

```json
{ "provider": "faster-whisper", "text": "...", "durationMs": 12000, "confidence": 0.9 }
```

The repository includes `workers/asr-worker.example.js` as a stable HTTP wrapper. Replace `transcribeWithFreeEngine()` with faster-whisper invocation if voice input is required.
