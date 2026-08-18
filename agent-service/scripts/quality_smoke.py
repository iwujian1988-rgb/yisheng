#!/usr/bin/env python3
"""Real-provider quality smoke for the Python TextAgent professional path."""

from __future__ import annotations

import asyncio
import json
import os
import re
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

REPO_ROOT = Path(__file__).resolve().parents[2]
AGENT_ROOT = REPO_ROOT / "agent-service"
if str(AGENT_ROOT) not in sys.path:
    sys.path.insert(0, str(AGENT_ROOT))

backend_env = REPO_ROOT / "backend" / ".env"
if backend_env.exists():
    for raw_line in backend_env.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))

from app.agents.text import TextAgent
from app.agents.orchestrator import OrchestratorAgent


SOURCE = (
    "发热3天，最高39.2℃，伴咳嗽有少量黄痰。外院口服头孢两天效果一般。"
    "既往高血压5年，青霉素过敏。查体双肺呼吸音粗，右下肺可闻及湿啰音。"
    "今天收入院，计划完善血常规、CRP及胸部CT。"
)


async def main() -> None:
    template = {
        "id": "tpl_official_first_course",
        "name": "首次病程记录",
        "generationContract": {
            "sections": ["病例特点", "初步诊断", "诊断依据", "鉴别诊断", "诊疗计划"],
            "judgmentPolicy": "诊断、诊断依据、鉴别诊断和诊疗计划只能整理用户明确表达的专业判断。",
        },
        "writingBlueprint": {
            "outline": [
                {"heading": "病例特点", "compose": "按已知病史、查体分点整理。"},
                {"heading": "诊疗计划", "compose": "只整理已明确计划。"},
            ],
            "lengthPolicy": {"minimumSourceChars": 60, "minimumBodyChars": 80, "minimumBodyToSourceRatio": 1.15},
        },
    }
    result = await TextAgent().execute({
        "sources": {"pastedText": SOURCE},
        "task": "organize",
        "mode": "professional",
        "template": template,
    })
    body = str(result.get("bodyText") or "")
    forbidden = [r"社区获得性肺炎", r"诊断依据", r"抗感染治疗", r"监测体温"]
    if result.get("status") != "ok" or any(re.search(pattern, body) for pattern in forbidden):
        print("PYTHON_AGENT_QUALITY_SMOKE_FAILED")
        print(result.get("status"), result.get("quality"))
        print(body)
        sys.exit(1)
    if not all(token in body for token in ("39.2℃", "青霉素过敏", "血常规", "CRP", "胸部CT")):
        print("PYTHON_AGENT_QUALITY_SMOKE_FAILED missing source facts")
        sys.exit(1)
    print("PYTHON_AGENT_QUALITY_SMOKE_OK")
    print(body)

    done_payload = None
    async for event in OrchestratorAgent().execute_stream({
        "materialText": SOURCE,
        "mode": "professional",
        "template": template,
        "detailLevel": "standard",
        "messages": [],
        "attachments": [],
    }):
        if event.startswith("event: done\n"):
            done_payload = json.loads(event.split("data: ", 1)[1].strip())
    final = (done_payload or {}).get("finalResult") or {}
    orchestrated_body = str(final.get("bodyText") or "")
    if final.get("status") != "ok" or any(re.search(pattern, orchestrated_body) for pattern in forbidden):
        print("PYTHON_ORCHESTRATOR_QUALITY_SMOKE_FAILED")
        print(final.get("status"), final.get("quality"))
        print(orchestrated_body)
        sys.exit(1)
    if not all(token in orchestrated_body for token in ("39.2℃", "青霉素过敏", "血常规", "CRP", "胸部CT")):
        print("PYTHON_ORCHESTRATOR_QUALITY_SMOKE_FAILED missing source facts")
        sys.exit(1)
    print("PYTHON_ORCHESTRATOR_QUALITY_SMOKE_OK")


if __name__ == "__main__":
    asyncio.run(main())
