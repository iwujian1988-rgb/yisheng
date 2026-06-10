# Backend API Contracts

## Goal

This document defines the backend contract for the text transfer assistant.

The product helps users prepare, refine, confirm, and transfer text to a computer through a dedicated hardware device. The default mini program experience is general office text. Professional templates are gated by device permission and must not appear in the default user experience.

The backend must support:
- WeChat login and paid-user entitlement.
- Admin creation and maintenance of service users.
- Device binding and service state.
- User-only readable text storage.
- Redaction before third-party AI.
- General and professional template access control.
- Audit logs for admin operations.

## Global Rules

- All endpoints use JSON.
- Authenticated requests use `Authorization: Bearer <token>`.
- Admin endpoints require admin roles.
- Admins must not receive raw user text.
- AI/OCR/ASR endpoints must not log raw user text.
- Third-party AI requests must receive redacted text only.
- Default templates and UI copy must stay general. Professional templates are returned only when the current user has professional device access.

## Common Response

```json
{
  "code": "OK",
  "data": {},
  "message": ""
}
```

Error example:

```json
{
  "code": "AUTH_REQUIRED",
  "message": "login required"
}
```

## Auth

### POST `/api/auth/wechat-login`

Primary mini program login endpoint.

Request:

```json
{
  "code": "wechat code",
  "userInfo": {}
}
```

Rules:
- Mini program calls `wx.login()` and sends the returned `code`.
- Backend exchanges `code` for `openid` and optional `unionid`.
- Backend creates a user if the identity is new.
- SMS verification is not required for the main login path.
- Paid access is decided by entitlement, activation code, and device binding.

Response `data`:

```json
{
  "token": "jwt",
  "user": {
    "id": "user id",
    "phone": "masked phone",
    "nickname": "display name"
  },
  "purchaseStatus": "none | paid",
  "deviceBindingStatus": "not_bound | bound",
  "serviceStatus": "active | expired | disabled",
  "templateAccess": "general | professional",
  "device": null
}
```

### POST `/api/auth/login`

Compatibility account-login endpoint for development and internal fallback.

### GET `/api/auth/me`

Returns the current user session summary.

## Admin Paid Users

### POST `/api/admin/paid-users`

Creates or opens service access after hardware purchase.

Request:

```json
{
  "phone": "optional phone",
  "openid": "optional openid",
  "userId": "optional user id",
  "expiryDate": "YYYY-MM-DD",
  "serialNo": "optional device serial",
  "templateAccess": "general | professional",
  "remark": "optional admin note"
}
```

Response:

```json
{
  "id": "user id",
  "phone": "masked phone",
  "status": "active",
  "expiryDate": "YYYY-MM-DD",
  "serialNo": "device serial",
  "templateAccess": "general"
}
```

Required audit event:
- `paid_user/create_or_open`

### GET `/api/admin/paid-users`

Query:
- `keyword`
- `status`
- `page`
- `pageSize`

Returns paginated service users. Phone numbers are masked.

### PATCH `/api/admin/paid-users/{id}`

Allowed fields:
- `expiryDate`
- `status`
- `remark`
- `templateAccess`

Required audit event:
- `paid_user/update`

## Admin Management Backend

The web management backend is a separate browser-based system. It does not run inside the mini program.

### POST `/api/admin/auth/login`

Admin login. Admin accounts are independent from mini program users.

Request:

```json
{
  "account": "admin account",
  "password": "password"
}
```

Response `data`:

```json
{
  "token": "admin session token",
  "admin": {
    "id": "admin id",
    "account": "admin",
    "role": "super_admin | operations_admin | customer_service_admin"
  }
}
```

### Admin Endpoints

- `GET /api/admin/admin-users`
- `POST /api/admin/admin-users`
- `PATCH /api/admin/admin-users/{id}`

Only `super_admin` can manage admin accounts.

### Device Management Endpoints

- `GET /api/admin/devices`
- `POST /api/admin/devices`
- `POST /api/admin/devices/import`
- `POST /api/admin/devices/{id}/unbind`

Device fields include `templateAccess`. Professional template access is granted through an eligible device or an admin-maintained entitlement.

Single device upsert request:

```json
{
  "serialNo": "PRO-PILOT-001",
  "templateAccess": "professional",
  "proofCode": "2468",
  "reservedUserId": "user_xxx",
  "model": "TXT-HID",
  "firmwareVersion": "pilot",
  "protocolVersion": "locked"
}
```

Batch import request:

```json
{
  "devicesText": "serialNo,templateAccess,proofCode,model\nPRO-PILOT-001,professional,2468,TXT-HID"
}
```

or:

```json
{
  "devices": [
    {
      "serialNo": "PRO-PILOT-001",
      "templateAccess": "professional",
      "proofCode": "2468"
    }
  ]
}
```

Rules:
- `proofCode` is stored only as `proofCodeHash`.
- Admin and user APIs return `hasProofCode`, never `proofCode` or `proofCodeHash`.
- Duplicate `serialNo` updates the existing device.
- Batch import accepts up to 500 rows and returns per-row errors without exposing proof data.

### Template Management Endpoints

- `GET /api/admin/templates`
- `POST /api/admin/templates`
- `GET /api/admin/templates/{id}`
- `PATCH /api/admin/templates/{id}`

Template fields:

```json
{
  "templateCode": "office_meeting_notes",
  "name": "Meeting Notes",
  "description": "Short user-facing description",
  "category": "office | report | email | notice | custom",
  "audience": "general | professional",
  "promptContent": "backend-managed instruction",
  "variableDefs": [
    {
      "key": "topic",
      "label": "Topic",
      "type": "input | textarea",
      "required": true,
      "placeholder": "Field hint"
    }
  ],
  "status": "draft | published"
}
```

Rules:
- `general` templates are visible to ordinary users.
- `professional` templates are visible only after backend confirms professional access.
- Prompt content is backend-managed sensitive configuration.
- Template prompts must instruct the model not to invent facts.

### Activation Code Endpoints

- `GET /api/admin/activation-codes`
- `POST /api/admin/activation-codes/import`

Activation codes open paid service after hardware sale. They do not expose prices by default.

### Feedback Review Endpoints

- `GET /api/admin/feedbacks`
- `PATCH /api/admin/feedbacks/{id}`

Feedback review stores status and metadata. Avoid storing raw sensitive content in examples or logs.

### Export Endpoints

- `GET /api/admin/exports/users.csv`
- `GET /api/admin/exports/audit-logs.csv`

Export rules:
- Maximum 10,000 rows per export.
- Phone numbers are masked.
- Raw user text must never be exported.

### Dashboard And Audit

- `GET /api/admin/dashboard`
- `GET /api/admin/audit-logs`

Audit logs are immutable and retained for at least 180 days.

## Device

### GET `/api/devices/me`

Returns the current user's bound device or `null`.

### POST `/api/devices/bind`

Request:

```json
{
  "serialNo": "device serial",
  "proofCode": "device proof code"
}
```

Backend checks:
- User has paid entitlement.
- Device exists or can be reserved by policy.
- Device is not bound to another user.
- Proof code is valid when configured.

### POST `/api/devices/unbind`

Request:

```json
{
  "deviceId": "device id",
  "reason": "reason code"
}
```

## Purchase And Activation

### POST `/api/purchase/activate`

Request:

```json
{
  "activationCode": "code"
}
```

Response updates current user's entitlement.

### GET `/api/purchase/records`

Returns current user's service records. Do not include price unless product policy explicitly requires it.

## Text History Storage

### POST `/api/content/history`

Request:

```json
{
  "ciphertext": "encrypted text",
  "envelope": {
    "version": "v1",
    "algorithm": "backend-defined",
    "keyId": "user key id"
  },
  "source": "manual | ocr | asr | ai | template",
  "textLength": 0
}
```

Rules:
- Backend stores ciphertext only.
- Admin APIs expose metadata only.
- Plaintext must not appear in logs.

## AI

### POST `/api/ai/assistant`

Request:

```json
{
  "taskType": "organize | polish | summary | proofread | format",
  "redactedText": "text after redaction",
  "redactionMapId": "server or client reference"
}
```

Rules:
- Input must be redacted before provider call.
- Provider response must be shown to the user for confirmation before transfer.
- Raw user text must not be sent to third-party AI.

### POST `/api/ai/templates/{id}/generate`

Request:

```json
{
  "values": {
    "topic": "user-provided value"
  }
}
```

Response:

```json
{
  "resultText": "generated text",
  "confirmText": "items that need user confirmation",
  "templateId": "template id",
  "source": "template"
}
```

Rules:
- Backend validates required fields before generation.
- Backend checks template audience against current user access.
- Missing or uncertain items are returned in `confirmText`.

## OCR And ASR

### POST `/api/ocr/recognize`

Request:

```json
{
  "imageBase64": "base64 image content",
  "fileType": "jpg | png | webp"
}
```

Returns recognized text for user confirmation. OCR should prefer a free or open-source worker when possible.

### POST `/api/asr/transcribe`

Request:

```json
{
  "audioBase64": "base64 audio content",
  "fileType": "mp3 | wav | m4a"
}
```

Returns transcription for user confirmation.

## Support And QA

### POST `/api/support/feedbacks`

Stores feedback metadata and content length. Avoid writing raw sensitive text into examples or logs.

### POST `/api/qa/long-text-tests`

Records hardware test result:

```json
{
  "charCount": 3000,
  "elapsedMs": 0,
  "passed": false,
  "deviceSerial": "optional",
  "mode": "WIN10 | WIN11 | RAW"
}
```

Acceptance target:
- 3000 Chinese characters transferred within 120 seconds.

## Next Implementation Order

1. WeChat login and paid-user entitlement.
2. Admin paid-user and device permission management.
3. Device binding.
4. User encrypted history storage.
5. Template generation and AI provider gateway.
6. Free/open-source OCR worker gateway.
7. ASR worker gateway.
8. QA long-text hardware test records.
