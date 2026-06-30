from __future__ import annotations

import httpx


def format_provider_error(response: httpx.Response) -> str:
    try:
        data = response.json()
    except Exception:
        return f"上游 AI 服务错误 ({response.status_code})"

    if not isinstance(data, dict):
        return f"上游 AI 服务错误 ({response.status_code})"

    error_obj = data.get("error") if isinstance(data.get("error"), dict) else {}
    code = str(data.get("code") or error_obj.get("code") or "").strip()
    message = str(data.get("message") or error_obj.get("message") or "").strip()

    if code == "Arrearage" or "good standing" in message.lower():
        return "阿里云百炼账户欠费或余额不足，请登录控制台充值后重试"

    if message:
        return message
    if code:
        return code
    return f"上游 AI 服务错误 ({response.status_code})"


def raise_for_provider_response(response: httpx.Response) -> None:
    if response.is_success:
        return
    raise RuntimeError(format_provider_error(response))
