# Backend Implementation TODO

## Priority 1: Auth And Entitlement

- `POST /api/auth/login`
- `POST /api/auth/register-code`
- `POST /api/auth/register`
- `POST /api/auth/wechat-login`
- `GET /api/purchase/entitlement`
- `POST /api/purchase/activate`

Current backend skeleton:
- `backend/src/server.js`
- `backend/src/modules/auth.js`
- `backend/src/modules/user-api.js`

Frontend local fallback already exists in:
- `services/auth/session.js`
- `services/auth/dev-auth.js`
- `services/payment/entitlement.js`
- `services/purchase/activation.js`

## Priority 2: Admin Paid Users

- `POST /api/admin/paid-users`
- `GET /api/admin/paid-users`
- `PATCH /api/admin/paid-users/{id}`
- `GET /api/admin/service-records`
- `POST /api/admin/activation-codes/import`
- `GET /api/admin/activation-codes`

Current backend skeleton:
- `backend/src/modules/admin.js`
- `backend/db/schema.sql`

Frontend local fallback already exists in:
- `services/admin/paid-users.js`
- `services/admin/activation-codes.js`
- `services/admin/dashboard.js`

## Priority 3: Device Binding

- `GET /api/devices/me`
- `POST /api/devices/bind`
- `POST /api/devices/unbind`

Frontend local fallback already exists in:
- `services/device/binding.js`

## Priority 4: Secure Content And AI

- `POST /api/content/history`
- `GET /api/content/history`
- `POST /api/ai/assistant`
- `POST /api/ocr/recognize`
- `POST /api/asr/transcribe`

Current backend skeleton:
- `backend/src/modules/provider-gateway.js`

OCR decision:
- Use free self-hosted OCR first.
- Primary: PaddleOCR worker on Aliyun ECS.
- Backup: RapidOCR for lighter deployment.
- Do not use paid Aliyun OCR as MVP default.

Hard rules:
- Admin APIs must not return plaintext medical content.
- AI provider calls must receive redacted text only.
- OCR/ASR/AI logs must not store raw medical text.

## Priority 5: QA And Hardware Acceptance

- `POST /api/qa/long-text-tests`
- `GET /api/qa/long-text-tests`

Acceptance target:
- 3000 Chinese characters transferred within 120 seconds.
