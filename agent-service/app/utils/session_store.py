from __future__ import annotations

import time
from typing import Any, Awaitable, Callable


class SessionStore:
    def __init__(self, ttl_seconds: int = 7200, max_messages: int = 40) -> None:
        self._ttl = ttl_seconds
        self._max_messages = max_messages
        self._sessions: dict[str, dict[str, Any]] = {}

    def _purge(self) -> None:
        now = time.time()
        expired = [key for key, value in self._sessions.items() if value.get("expires_at", 0) <= now]
        for key in expired:
            self._sessions.pop(key, None)

    def _touch(self, user_id: str) -> dict[str, Any]:
        entry = self._sessions.get(user_id) or {"messages": [], "expires_at": time.time() + self._ttl}
        entry["expires_at"] = time.time() + self._ttl
        self._sessions[user_id] = entry
        return entry

    def get(self, user_id: str) -> list[dict[str, Any]]:
        self._purge()
        entry = self._sessions.get(user_id)
        if not entry:
            return []
        return list(entry.get("messages") or [])

    def append(self, user_id: str, role: str, content: str) -> None:
        self._purge()
        entry = self._touch(user_id)
        entry["messages"].append({"role": role, "content": content})
        entry["messages"] = entry["messages"][-self._max_messages :]

    def append_sources_context(self, user_id: str, sources: dict[str, Any], storage: str = "full") -> None:
        self._purge()
        entry = self._touch(user_id)
        entry["messages"].append(
            {
                "role": "context",
                "kind": "sources",
                "storage": storage,
                "sources": sources,
            }
        )
        entry["messages"] = entry["messages"][-self._max_messages :]

    async def archive_full_sources(
        self,
        user_id: str,
        summarize: Callable[[dict[str, Any]], Awaitable[dict[str, Any]]],
    ) -> None:
        self._purge()
        entry = self._sessions.get(user_id)
        if not entry:
            return
        messages = entry.get("messages") or []
        changed = False
        for item in messages:
            if not isinstance(item, dict):
                continue
            if item.get("role") != "context" or item.get("kind") != "sources":
                continue
            if item.get("storage") != "full":
                continue
            sources = item.get("sources") if isinstance(item.get("sources"), dict) else {}
            item["sources"] = await summarize(sources)
            item["storage"] = "summary"
            changed = True
        if changed:
            entry["messages"] = messages[-self._max_messages :]
            self._touch(user_id)

    def reset(self, user_id: str) -> None:
        self._sessions.pop(user_id, None)


_session_store: SessionStore | None = None


def get_session_store(ttl_seconds: int = 7200, max_messages: int = 40) -> SessionStore:
    global _session_store
    if _session_store is None:
        _session_store = SessionStore(ttl_seconds=ttl_seconds, max_messages=max_messages)
    return _session_store
