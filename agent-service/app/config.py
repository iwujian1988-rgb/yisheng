from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

AI_MODEL_ALIASES = {
    "default-chat-model": "deepseek-v3",
}


def resolve_ai_model(model: str) -> str:
    return AI_MODEL_ALIASES.get(model, model)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    service_port: int = 8000
    service_host: str = "0.0.0.0"
    log_level: str = "INFO"

    backend_url: str = "http://localhost:8080"
    backend_api_key: str = ""

    # OpenAI-compatible chat gateway (aligned with backend AI_* env vars)
    ai_provider: str = "openai-compatible"
    ai_base_url: str = ""
    ai_chat_completions_url: str = ""
    ai_api_key: str = ""
    ai_model: str = "default-chat-model"
    ai_thinking_mode: str = "disabled"
    ai_timeout_ms: int = 60000

    orchestrator_model: str = ""
    text_model: str = ""
    template_model: str = ""
    orchestrator_skip_llm_heuristic: bool = True

    dashscope_api_key: str = ""
    dashscope_base_url: str = "https://dashscope.aliyuncs.com"

    ocr_model: str = "qwen-vl-ocr-2025-11-20"
    ocr_structured_model: str = "qwen3-vl-flash"
    ocr_task: str = "text_recognition"
    ocr_timeout: int = 60000
    ocr_max_bytes: int = 5242880

    asr_model: str = "qwen3-asr-flash"
    asr_timeout: int = 600000
    asr_max_bytes: int = 62914560

    orchestrator_timeout: int = 120000
    session_context_ttl: int = 7200
    session_max_messages: int = 40
    session_history_llm_limit: int = 20
    session_source_summary_max_chars: int = 1500

    @model_validator(mode="after")
    def _apply_model_defaults(self) -> "Settings":
        default = self.ai_model or "default-chat-model"
        if not self.orchestrator_model:
            object.__setattr__(self, "orchestrator_model", default)
        if not self.text_model:
            object.__setattr__(self, "text_model", default)
        if not self.template_model:
            object.__setattr__(self, "template_model", default)
        return self

    @property
    def effective_ai_api_key(self) -> str:
        return self.ai_api_key or self.dashscope_api_key

    @property
    def effective_dashscope_api_key(self) -> str:
        # OCR/ASR are DashScope-native and must not receive a separate text-provider key.
        return self.dashscope_api_key or self.ai_api_key

    @property
    def effective_ai_base_url(self) -> str:
        if self.ai_base_url:
            return self.ai_base_url
        if self.effective_ai_api_key:
            return "https://dashscope.aliyuncs.com/compatible-mode"
        return ""

    @property
    def ai_configured(self) -> bool:
        return bool(self.effective_ai_api_key and (self.ai_chat_completions_url or self.effective_ai_base_url))


@lru_cache
def get_settings() -> Settings:
    return Settings()
