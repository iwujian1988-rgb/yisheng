# Repository Development Rules

## AI creation V3 is authoritative

Before changing any of the following areas, read `docs/AI_CREATION_ITERATION_TECHNICAL_PLAN_V3.md` completely:

- `pages/ai/`
- `pages/ocr/`
- `pages/asr/`
- `services/ai/`
- `services/ocr/`
- `services/asr/`
- `backend/src/modules/agent-api.js`
- `backend/src/modules/ai-workspaces.js`
- `backend/src/modules/direct-ai-chat.js`
- `backend/src/modules/provider-gateway.js`
- `backend/src/modules/text-quality.js`
- `backend/src/repositories/ai-workspace-repository.js`
- `backend/src/data/official/`
- `agent-service/app/agents/`
- `agent-service/app/utils/text_quality.py`

For this scope:

1. Treat V3 as the only implementation plan. Older AI redesign documents are historical or foundational only.
2. Reuse the unique sources listed in V3. Do not create a parallel OCR, ASR, template, workspace, intent, prompt, generation, quality, permission, or button system.
3. Add or update contract/golden tests before changing production behavior.
4. Keep professional templates, fields, prompts, and access decisions on the backend. Do not add professional static content to public mini-program code.
5. Do not let AI output directly mutate a workspace. Validate all proposed actions against a fixed backend allowlist, ownership, revision, permission, and idempotency rules.
6. Do not put image/audio base64, complete OCR/ASR text, names, identifiers, or other sensitive source content in logs.
7. Node direct generation and Python Agent generation must satisfy the same input/output and quality contracts. Do not add a third generation path.
8. A release smoke pass is not proof of output quality. The V3 golden fixture, real-service evaluation, and device UI checks are release gates.
9. Preserve unrelated dirty-worktree changes. Use additive migrations and backward-compatible reads during rollout.
10. Update the V3 implementation checklist when a phase is completed; do not mark work complete without the listed evidence.
