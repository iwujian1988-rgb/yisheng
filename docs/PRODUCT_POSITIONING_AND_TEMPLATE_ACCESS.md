# Product Positioning And Template Access

## 1. Default Positioning

The default product is a general-purpose text assistant for offline computer input:

- AI-assisted content drafting and polishing.
- Template-based field input.
- OCR/ASR assisted text import when configured.
- Bluetooth hardware transfer to a target computer without internet access.

Default user-facing copy must avoid industry-specific positioning. Do not describe the public product as a medical product, medical record tool, hospital system tool, or doctor-only tool.

## 2. Template Visibility

Templates are divided by audience:

- `general`: visible to normal users by default.
- `professional`: visible only when the bound device or device code grants professional template access.

The mini program must request templates from the backend. The backend is responsible for filtering templates by the user's current access profile.

## 3. Device Access Rule

Each device can carry `templateAccess`:

- `general`: default for normal devices.
- `professional`: unlocks restricted professional templates.

Backend binding currently infers professional access from reserved device metadata or serial prefixes such as `PRO-`, `DOC-`, or `MED-`. Production should prefer explicit backend device metadata over prefix matching.

## 4. Backend Template Fields

Admin-created templates should include:

- `templateCode`: stable unique code.
- `name`: template display name.
- `description`: short usage description.
- `category`: general UI grouping, such as `office`, `report`, `email`, `notice`.
- `audience`: `general` or `professional`.
- `scene`: optional business scene.
- `promptContent`: backend-maintained AI task instruction.
- `variableDefs`: fields shown to the user.
- `status`: `draft` or `published`.

Normal users must not receive professional templates from `/api/ai/templates`.

## 5. AI Generation Boundary

AI generation must:

- Use only user-provided fields and selected template metadata.
- Not invent missing facts.
- Output two sections: sendable body and confirmation items.
- Require user confirmation before sending to the target computer.

## 6. Copywriting Rule

General pages should say:

- "文本"
- "内容"
- "目标电脑"
- "离线电脑输入"
- "AI 内容整理"

Restricted professional pages may use professional wording only after access has been granted.
