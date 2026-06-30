# Agent Service

独立 Python FastAPI 服务，见 `docs/Multi-Agent系统设计方案.md`。

## 本地启动

```bash
cd agent-service
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
copy .env.example .env   # 填入 AI_API_KEY、AI_BASE_URL 等（与 backend 一致）
uvicorn app.main:app --reload --port 8000
```

## 健康检查

- `GET /health` — 返回 `ai_configured`、`dashscope_configured`
- `GET /v1/diagnostics/chat`（需配置 `BACKEND_API_KEY` 与 `AI_API_KEY` + endpoint）

## Phase 状态

- Phase 1：骨架、路由、OpenAI 兼容 Chat 客户端 ✅
- Phase 2：Text / Template Agent + Prompt ✅（需 `AI_API_KEY` + `AI_MODEL=default-chat-model`）
- Phase 3：OCR / ASR Agent（待实现）
- Phase 5：Orchestrator（待实现）

## 联调

Node 后端默认开发环境：

- `AGENT_SERVICE_ENABLED=true`
- `AGENT_SERVICE_URL=http://127.0.0.1:8000`
- `AGENT_SERVICE_API_KEY=dev-agent-key`

与本服务 `.env` 中 `BACKEND_API_KEY` 保持一致。

Text / Orchestrator / Template 与 Node `provider-gateway` 共用同一套 `AI_*` 配置，默认模型名为 `default-chat-model`（网关侧路由到 DeepSeek 等具体模型）。
