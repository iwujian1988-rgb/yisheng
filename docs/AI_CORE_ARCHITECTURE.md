# AI Core Architecture

## 1. Core Boundary

All AI content generation is owned by Codex core services. Pages must not:

- Write prompts directly.
- Call DeepSeek directly.
- Bypass redaction.
- Send AI output to the computer without user confirmation.
- Store raw medical text in logs or page-level test data.

Current modules:

```text
services/security/content-guard.js
services/ai/prompts.js
services/ai/provider.js
services/ai/assistant.js
```

## 2. Call Flow

```text
Page
-> services/ai/assistant.generateContent()
-> services/security/content-guard.prepareTextForThirdPartyAi()
-> services/ai/prompts.getPromptConfig()
-> services/ai/provider.callAi()
-> user reviews output
-> save as draft or send through home transfer flow
```

## 3. Provider Strategy

Mini program code does not hold DeepSeek API keys and does not call DeepSeek directly.

Provider behavior:

- If `app.globalData.baseUrl` is empty, use `dev-ai`.
- If `baseUrl` exists, call backend endpoint `/api/ai/assistant`.
- Backend is responsible for DeepSeek V4 credentials, provider retry, provider logging and rate limits.

The request sent to backend contains:

- `taskType`.
- `redactedText`.
- `promptId`.
- `inputSummary`.

It must not contain unredacted medical text.

## 4. Prompt Types

Current prompt types:

- `medical_record_cleanup`
- `report_summary`
- `term_normalization`
- `content_polish`

Prompt configs stay in `services/ai/prompts.js`.

## 5. Dev Provider

The dev provider is a service-layer test provider. It only returns a safe summary:

- task name
- input length
- redaction hit summary
- note that real provider is not configured

It never echoes the original user text.

## 6. Remaining Work

- Backend DeepSeek V4 gateway.
- Streaming response support if needed.
- AI conversation persistence.
- Template variable system.
- AI usage metrics.
- Provider error retry and fallback policy.
