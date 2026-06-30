# Multi-Agent 协同系统设计方案

> 版本：v1.3
> 更新时间：2026-06-24
> 状态：已确认（可开工）

**已确认决策摘要：**
- 独立 Python（FastAPI）Agent 服务；Agent 不可用则**硬失败**，不回退 `provider-gateway`
- 现有模块直接重构，老数据废弃不迁移；旧 API **一次性废弃**（无兼容期）
- **入口 A**：各功能页按钮，直连单 Agent；**入口 B**：`pages/ai/detail` AI 对话页（**替换**原 modes/quickActions/assistant 逻辑），经 Orchestrator
- 废弃 `quickActions` 表、`actionId`、填表式 `generateTemplate`；Text Agent 统一为 `task` + `mode` + 可选 `template`
- 模板 ID 统一 `tpl_official_*` / `tpl_user_*`，废弃 `templateCode`；库内字段 **snake_case**（`is_required`）
- 10 种医疗模板本次均为 `audience: professional`；「通用」类型供用户自建模板选用，无官方种子
- Phase 2：普通用户只测 Text 五类 `task`（无模板）；专业侧首测首次病程
- 权限：**所有** `/api/agent/*` 需会员；**不要求**连设备才能调 API；专业模板列表未连设备时可 UI 隐藏
- 脱敏：**仅 Node 代理层**执行后再转发 Agent 服务
- 入口 B：多 Agent 自动串联，**对话内直接出整理结果**（跳过 OCR/ASR 确认页）；发送前仍走 editor 确认
- 会话上下文：单实例**内存**，TTL 2h；未种子化模板类型 → `organize` + `professional` 通用 Prompt，不报错
- Text / Orchestrator / Template 使用与 Node **相同的 OpenAI 兼容 AI 网关**（`AI_API_KEY` + `AI_MODEL=default-chat-model`），不单独配置 DeepSeek

---

## 1. 架构概览

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           小程序前端                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 图片识别 │  │ 语音转写 │  │ 智能整理 │  │ 模板创作 │  │ 混合输入 │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
└───────┼────────────┼────────────┼────────────┼────────────┼───────────┘
        │            │            │            │            │
        ▼            ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Node.js 后端 (业务层)                                  │
│  - 用户认证、权限管理、模板 CRUD                                          │
│  - 设备管理、会话验证、脱敏网关                                           │
│  - Agent 服务代理（入口 A 直连 / 入口 B 编排）                            │
└─────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼ HTTP (内网通信)
┌─────────────────────────────────────────────────────────────────────────┐
│                 独立 Agent 服务 (Python FastAPI)                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     Orchestrator Agent                           │   │
│  │                    (意图识别、任务调度)                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│         │                    │                    │                    │
│         ▼                    ▼                    ▼                    │
│  ┌────────────┐      ┌────────────┐      ┌────────────┐              │
│  │ OCR Agent  │      │ ASR Agent  │      │ Text Agent │              │
│  │ QwenVL-OCR │      │ Qwen3-ASR  │      │ AI 网关    │              │
│  └────────────┘      └────────────┘      │default-chat│              │
│                                          └────────────┘              │
│                                                │                         │
│                                    ┌───────────┴───────────┐           │
│                                    │                       │           │
│                                    ▼                       ▼           │
│                            ┌────────────┐      ┌────────────┐         │
│                            │Template AG │      │ 后续扩展...│         │
│                            │ AI 网关    │      │            │         │
│                            │default-chat│      │            │         │
│                            └────────────┘      └────────────┘         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Agent 定义

| Agent              | 职责                     | 底层模型       | 输入             | 输出          |
| ------------------ | ---------------------- | ---------- | -------------- | ----------- |
| **Orchestrator**   | 意图识别、任务分解、Agent 调度、结果整合 | `default-chat-model` | 用户请求（文本/图片/音频） | 调度指令 + 最终结果 |
| **OCR Agent**      | 图片文字识别、结构化提取、表格解析      | QwenVL-OCR | 图片（base64）     | 文本 + 结构化数据  |
| **ASR Agent**      | 语音转文字、标点修复、说话人区分       | Qwen3-ASR  | 音频（base64）     | 文本 + 元数据    |
| **Text Agent**     | 病历整理、内容润色、格式转换、术语规范    | `default-chat-model` | 文本 + 任务指令 + 模板 | 结构化文本       |
| **Template Agent** | 从用户内容中提取模板结构、生成可复用模板   | `default-chat-model` | 文本 + 模板类型 + 官方基线 | 模板草稿（JSON）  |

---

## 2. 调度方式：混合模式（方案 C）

### 2.1 双入口设计

```
┌─────────────────────────────────────────────────────────────┐
│                        用户交互入口                            │
├─────────────────────────────────────────────────────────────┤
│  入口 A：功能按钮（分散在 OCR/ASR/结果页/模板创作等，直连 Agent） │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 拍照识别、录音转写、智能整理（选 task）、模板创作等      │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  入口 B：AI 对话页 pages/ai/detail（替换原智能创作对话逻辑）    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 自然语言 + 图片/录音附件；多轮对话                      │   │
│  │ "帮我处理这张检查报告" / "整理成门诊记录" 等             │   │
│  └─────────────────────────────────────────────────────┘   │
│           ↓ POST /api/agent/chat → Orchestrator            │
│           ↓ 自动串联，对话内直接展示 finalResult            │
└─────────────────────────────────────────────────────────────┘
```

#### 与原 AI 对话页的关系（已废弃）

以下能力**全部移除**，由入口 A / 入口 B 替代：

| 废弃 | 替代 |
|------|------|
| `GET /api/ai/modes` + 顶部 mode 芯片 | 入口 A：结果页等处的 `task` 选择；入口 B：自然语言 |
| `GET /api/ai/quick-actions` + action 芯片 | 入口 A：`task` + `template`；入口 B：Orchestrator |
| `POST /api/ai/assistant` + `actionId`/`mode` | `POST /api/agent/text` 或 `/api/agent/chat` |
| 填表 `POST /api/ai/templates/:id/generate` | `POST /api/agent/text` + `template.sample` |

原 `pages/ai/detail` **路由保留**，内部重写为**入口 B**（Orchestrator 对话），不再加载 modes/quickActions。

#### Text Agent 五类 task（入口 A 使用）

入口 A 的「智能整理」等按钮使用固定 task，**不在对话页顶部挂芯片**：

| task | 用途 | 典型场景 |
|------|------|----------|
| `organize` | 整理为结构清晰文本 | 录音/识别后整理；专业 + 模板 |
| `polish` | 润色表达 | 通用/专业 |
| `extract` | 提取要点 | 通用/专业 |
| `review` | 完整性检查 | 通用/专业 |
| `convert` | 格式转换/成稿 | 通知、邮件、汇报（**无专用模板**，通用 Prompt） |

原 `quickActions` 场景映射：专业整理类 → `organize` + 模板；`pro_polish` → `polish`；`pro_key_points` → `extract`；`pro_completeness` → `review`；`general_notice/email/report` → `convert` + `mode=general`。

#### 具体场景与流程描述

**创建自有模板**
1. 用户选择模板类型；
2. 用户传入模板方式：
   1. 拍照/图片：调用 OCR Agent 获得模板文本；
   2. 文本：直接进入下一步；
3. 获得文本后，调用 Template Agent 处理（Node 注入官方基线 `baselineFields`）；
4. 得到处理好的模板草稿，用户确认后由 Node 保存。

**录音写病历**
1. 选择录音方式：
   1. 直接转化，不需要模板：录音完成后直接调用 ASR Agent；
   2. 选择模板：
      1. 录音完成后调用 ASR Agent，获得文本；
      2. 调用 Text Agent 对文本进行处理（Node 注入所选模板）。

**拍照识别**
1. 根据按钮触发调用 OCR Agent 获得文本。

**文本优化**
1. 用户选择是否根据模板优化；
2. 根据按钮调用 Text Agent 对文本进行处理。

### 2.2 路由逻辑

#### 2.2.1 路由总原则

| 入口 | 路由方式 | 经过 Orchestrator | 典型 API |
|------|----------|-------------------|----------|
| **入口 A**（功能按钮） | 前端/Node **直连指定 Agent** | 否 | `/api/agent/ocr`、`/api/agent/asr`、`/api/agent/text`、`/api/agent/template` |
| **入口 B**（智能助手） | 统一进 Orchestrator 决策 | 是 | `/api/agent/chat` |

Node.js 后端职责：
- 认证、会员/设备权限校验
- 模板 CRUD（官方模板读、自用模板读写）
- 将请求代理到 Python Agent 服务
- **入口 A 不经过 Orchestrator**，由前端或 Node 按场景组装请求

#### 2.2.2 入口 A 路由表

| 场景 | 前端动作 | Node API | Agent | 请求要点 |
|------|----------|----------|-------|----------|
| 拍照识别 | 点「识别」 | `POST /api/agent/ocr` | OCR | `{ image, options }` |
| 录音转写（无模板） | 录音结束 | `POST /api/agent/asr` | ASR | `{ audio, options }` |
| 录音写病历（有模板） | 录音结束 → 整理 | ① `POST /api/agent/asr`<br>② `POST /api/agent/text` | ASR → Text | ② 带 `task: organize`、`templateId` |
| 文本优化（无模板） | 点「整理/润色」等 | `POST /api/agent/text` | Text | `{ text, task, mode }` |
| 文本优化（有模板） | 选模板后处理 | `POST /api/agent/text` | Text | 同上 + `template`（Node 按 ID 查库注入） |
| 创建自有模板（图片） | 选类型 → 拍照 | ① `POST /api/agent/ocr`<br>② `POST /api/agent/template` | OCR → Template | ② 带 `templateType` + `baselineFields` |
| 创建自有模板（文本） | 选类型 → 粘贴 | `POST /api/agent/template` | Template | 同上 |
| 保存模板 | 用户确认 | `POST /api/templates`（Node 业务 API） | — | Agent 只生成草稿，**落库由 Node 完成** |

#### 2.2.3 入口 B 路由表（Orchestrator）

| 用户意图关键词/附件 | Orchestrator 决策 | 工作流类型 |
|---------------------|-------------------|------------|
| 仅图片 / 「识别」 | `ocr` | single |
| 图片 + 「整理/格式化/写成 xxx」 | `ocr → text(organize)` | sequential |
| 仅音频 / 「转写/录音」 | `asr` | single |
| 音频 + 「整理成病历/记录」 | `asr → text(organize)` | sequential |
| 「做成模板/生成模板」+ 文本 | `template` | single |
| 「做成模板」+ 图片 | `ocr → template` | sequential |
| 多图 + 「全部识别/合并」 | `ocr × N → merge → text?` | parallel → optional sequential |
| 录音 + 图片 + 「完整记录」 | `asr ∥ ocr → text(organize)` | parallel → sequential |
| 纯文本 + 「润色/提取/检查」 | `text(task=对应模式)` | single |
| 意图不明 | 返回 `userMessage` 追问，**不执行** | — |

> **入口 B 体验（已确认）**：
> - 多 Agent **自动串联**（如 `ocr → text`），**不经过** OCR/ASR 结果确认页
> - 对话气泡**直接展示** `finalResult`（`bodyText` + `confirmItems`）
> - 可选折叠展示 `results.ocr.text` 等中间结果供核对
> - 蓝牙发送前仍须「使用这段」→ editor → 用户确认
>
> **入口 B 安全**：每次进入 Text/Template 等 LLM 前，**Node 脱敏**后转发。入口 A 多步由用户显式触发，保留 OCR/ASR 确认页。

#### 2.2.4 Node 代理伪代码

```javascript
// 入口 A：直连
async function agentText(req, res) {
  const body = await parseBody(req);
  if (body.templateId) {
    body.template = await loadTemplate(body.templateId, actor.id); // Node 查库
  }
  return callAgentService({ type: 'text', data: body });
}

// 入口 B：编排
async function agentChat(req, res) {
  return callAgentService({ type: 'orchestrate', data: await parseBody(req) });
}
```

#### 2.2.5 模板数据注入规则

Text / Template Agent **不直连数据库**。Node 在代理前注入：

| Agent | Node 注入字段 | 来源 |
|-------|---------------|------|
| Template | `baselineFields` | 同 `templateType` 的官方模板 `fields` |
| Text | `template`（含 `fields` + `sample`） | 用户选的模板记录 |
| Text（未选模板、无官方种子） | 无注入或空 `baselineFields` | `organize` + `mode=professional` 通用 Prompt，**不报错** |

---

## 3. Agent 详细设计

### 3.1 Orchestrator Agent（编排者）

**职责**：
1. 解析用户请求意图
2. 决定调用哪些 Agent
3. 协调 Agent 间数据流转
4. 整合多 Agent 结果
5. 管理对话上下文（会话级，见 §9）

**输入格式**：

```json
{
  "message": "用户输入的文本或描述",
  "attachments": [
    { "type": "image", "data": "base64..." },
    { "type": "audio", "data": "base64..." }
  ],
  "context": {
    "conversationHistory": [],
    "userPreferences": {},
    "deviceStatus": {}
  }
}
```

**输出格式**：

```json
{
  "intent": "用户意图的简短描述",
  "reasoning": "意图推理过程",
  "workflow": {
    "type": "single|sequential|parallel",
    "steps": [
      { "agent": "ocr", "input": {} }
    ],
    "mergeStrategy": "如何合并多个 Agent 的结果"
  },
  "userMessage": "向用户展示的简短说明",
  "finalResult": {
    "resultText": "...",
    "bodyText": "...",
    "confirmItems": []
  },
  "results": {
    "ocr": { "text": "..." },
    "text": { "bodyText": "...", "confirmItems": [] }
  },
  "suggestions": ["后续可能的操作"]
}
```

前端默认渲染 `finalResult`；`results.*` 供折叠查看中间步骤。

**System Prompt**（见 `prompts/orchestrator.txt`）核心规则：

- 可调用的 Agent：`ocr`、`asr`、`text`、`template`
- 工作流类型：单 Agent / 串行 / 并行 / 条件分支
- 常见场景：`ocr`、`ocr→text`、`asr`、`asr→text`、`template`、`ocr→template`、`asr∥ocr→text`
- 必须以 JSON 输出决策；医疗内容严格保护；不确定时追问用户

**注意事项**：
- 医疗内容必须严格保护，不记录、不外泄
- 不确定的操作向用户确认后再执行
- 保持会话级对话上下文，支持追问和修正
- 对于复杂任务，分步骤向用户汇报进度

---

### 3.2 OCR Agent（图片识别）

**实现方式**：主链路为 **DashScope QwenVL-OCR API 直调**，不使用 LLM System Prompt。结构化字段由 API 响应解析；如需增强，可选调用 Text Agent 做后处理。

**职责**：
1. 从图片中提取文字（印刷体、手写体）
2. 识别表格结构并转为结构化数据
3. 处理医学影像报告、化验单等特定格式

**输入格式**：

```json
{
  "image": "base64编码的图片",
  "options": {
    "format": "text|structured|table",
    "language": "zh-CN",
    "extractFields": ["字段1", "字段2"]
  }
}
```

**输出格式**：

```json
{
  "text": "识别出的完整文本",
  "documentType": "blood_test|radiology|prescription|other",
  "regions": [
    {
      "type": "table|paragraph|field",
      "content": "...",
      "position": {}
    }
  ],
  "structured": {
    "fields": {},
    "tables": []
  },
  "confidence": 0.95,
  "issues": ["模糊区域提示"]
}
```

**质量标准**：
- 数值、单位必须准确对应
- 异常标记（↑↓）必须保留
- 不确定的用词标注 `[不确定]`
- 表格结构尽量还原

---

### 3.3 ASR Agent（语音转写）

**实现方式**：主链路为 **DashScope Qwen3-ASR API 直调**，`punctuation: true` 由 API 配置开启。说话人区分、术语校正为 API 选项；可选 Text Agent 后处理。

**职责**：
1. 将语音转写为文字
2. 自动添加标点符号
3. 识别说话人（如需要）
4. 处理医学术语的准确转写

**输入格式**：

```json
{
  "audio": "base64编码的音频",
  "options": {
    "format": "mp3|m4a|wav",
    "speakerDiarization": true,
    "punctuation": true,
    "domain": "medical"
  }
}
```

**输出格式**：

```json
{
  "text": "转写文本",
  "segments": [
    {
      "speaker": "医生|患者|A",
      "text": "...",
      "timestamp": [0, 15],
      "confidence": 0.95
    }
  ],
  "medicalTerms": ["高血压", "糖尿病"],
  "duration": 120,
  "language": "zh-CN",
  "warnings": ["某些片段不清晰"]
}
```

**质量标准**：
- 医学术语准确转写，不打断专业词汇
- 数字、单位、药名必须准确
- 保留关键的原话表述
- 不确定的词语标注 `[听不清]`

---

### 3.4 Text Agent（文本处理）

**职责**：
1. 病历整理（口述→规范记录）
2. 内容润色（表达优化、语句通顺）
3. 格式转换（如门诊记录→出院小结）
4. 要点提取（从长文中提取关键信息）
5. 术语规范（统一医学术语表述）

**输入格式**：

```json
{
  "text": "待处理的文本",
  "task": "organize|polish|extract|convert|review",
  "mode": "general|professional",
  "template": {
    "id": "tpl_official_first_course",
    "templateType": "首次病程记录",
    "name": "首次病程记录",
    "fields": [],
    "sample": "..."
  },
  "baselineFields": {},
  "context": {}
}
```

| 字段 | 说明 |
|------|------|
| `template` | 用户选了模板时由 Node 注入完整模板记录 |
| `baselineFields` | 用户未选模板时，Node 按推断的 `templateType` 注入官方基线 |

**输出格式**：

```json
{
  "resultText": "完整原文（含【正文】块及待确认段落）",
  "bodyText": "【正文】解析结果",
  "confirmItems": ["待确认事项1", "待确认事项2"]
}
```

**System Prompt**（见 `prompts/text.txt`）核心规则：

1. 只基于用户提供的信息处理，不编造事实
2. 数值、单位、时间、药名等关键信息必须与原文一致
3. 不确定的内容标注「待确认」，缺失内容标注「待补充」
4. 不得替用户作出判断性结论或专业承诺
5. 输出必须含 `【正文】` 块；不得出现患者具体姓名，统一用「患者」
6. 用户未选模板时，判断文书类型，根据该类型官方模板的 `baselineFields` 作为整理要素参考

#### 动态注入数据区 (Input Data)

通过代码将 System Prompt 与以下变量拼接后提交大模型：
- `{{task}}`、`{{mode}}`
- `{{template.fields}}`、`{{template.sample}}` 或 `{{baselineFields}}`
- `{{user_text}}`（已脱敏）

---

### 3.5 Template Agent（模板创作）

**职责**：
1. 从用户提供的内容中提取结构化模板
2. 根据用户选择的模板类型，以官方模板的 `fields` 作为扫描基线
3. 将范本文本作为 `sample` 保存在模板草稿中，供后续 Text Agent 引用
4. 支持模板分类和标签（`official` / `custom`）

**输入格式**：

```json
{
  "templateType": "首次病程记录",
  "templateName": "我的首次病程模板",
  "content": "范本文本（来自用户粘贴或 OCR 结果）",
  "baselineFields": {
    "templateType": "首次病程记录",
    "fields": [
      {
        "module": "病例特点",
        "key": "general_info",
        "label": "一般情况",
        "type": "string",
        "is_required": true,
        "description": "提取患者、性别、年龄"
      }
    ]
  },
  "options": {
    "allowExtraFields": true,
    "rejectNonMedical": true
  }
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `templateType` | 是 | 枚举见 §4 |
| `content` | 是 | 范本文本 |
| `baselineFields` | 是 | Node 按 `templateType` 查官方模板注入 |
| `templateName` | 否 | 自用模板名称，保存阶段使用 |
| `options.allowExtraFields` | 否 | 默认 `true`，允许超出官方基线的新字段 |
| `options.rejectNonMedical` | 否 | 默认 `true`，非医疗文本返回错误 |

**输出格式**：

成功：

```json
{
  "success": true,
  "templateDraft": {
    "templateType": "首次病程记录",
    "tag": "custom",
    "name": "我的首次病程模板",
    "fields": [
      {
        "module": "病例特点",
        "key": "general_info",
        "label": "一般情况",
        "type": "string",
        "is_required": true,
        "description": "提取患者、性别、年龄"
      }
    ],
    "sample": "原始范本文本（完整保留，供 Text Agent 引用）"
  },
  "warnings": ["检测到范本含具体数值，已在特征描述中泛化"]
}
```

失败（非医疗文本）：

```json
{
  "success": false,
  "error": {
    "code": "NOT_MEDICAL_CONTENT",
    "message": "该文本不属于医疗文书，无法生成模板"
  }
}
```

> `templateDraft` 由 Agent 生成；用户点保存后，Node 分配 `templateId` 写入数据库。Agent 层不生成最终 `templateId`。

#### 3.5.1 System Prompt

见 `prompts/template.txt`，核心内容：

**Role**：医疗信息化（HIT）架构师，对临床病历范本做「逆向工程」，提取 JSON Schema 特征结构。

**Task**：接收【模板类型】、【默认特征值参考】（`baselineFields`）、【范本文档】（`content`）。

**Workflow**：
1. **意图对齐**：判断是否为医疗文本；读取 `templateType`
2. **基线扫描**：以 `baselineFields` 为扫描基线
3. **特征泛化**：剔除隐私数据；提取段落标题为字段 label；超出基线的结构作为新增特征
4. **属性推断**：`string` | `text` | `enum` | `array`

**Output Rules**：
- 仅输出合法 JSON，无 Markdown 包裹
- 字段 `key` 使用 **snake_case**
- 样例文本放在模板级 `sample`，不在字段级重复

```json
{
  "template_type": "首次病程记录",
  "fields": [
    {
      "module": "病例特点",
      "key": "chief_complaint",
      "label": "主诉",
      "type": "string",
      "is_required": true,
      "description": "20字以内简要概括此次发病主要症状"
    }
  ]
}
```

#### 最佳实践

- 字段 `key` 使用 **snake_case**（如 `chief_complaint`）
- 展示名 `label` 使用中文
- `type` 枚举：`string | text | enum | array`
- 必填项用 `is_required: true`
- 每个 `module` 表示一级模块（病例特点、初步诊断等）
- 保持模板简洁，避免过度复杂

---

## 4. 模板模块

### 4.0 模板数据结构

| 模块 | 类型 | 描述 |
| ---- | ---- | ---- |
| 模板 ID | string | `tpl_official_{type_key}` 或 `tpl_user_{uuid}`，**废弃 `templateCode`** |
| 模板类型 | 枚举 | 见 §4.0.1 |
| 受众 | 枚举 | `general` \| `professional`（本次 10 种医疗均为 `professional`，后续可扩展） |
| 模板标签 | 枚举 | `official`（官方）/ `custom`（自用） |
| 模板名称 | string | 用户手动输入（官方模板为固定名称） |
| 特征表 | JSON | `fields` 数组，库内字段一律 **snake_case** |
| 样例 | string | `sample` 全文，Text Agent 拼 Prompt 用 |

**「通用」模板类型**：不作为 Phase 2 官方种子；供用户**创建自用模板**时选择类型；`baselineFields` 可为空或极简，主要由 Template Agent 从用户范文提取。

**Admin 维护（已确认）**：官方模板 `fields` / `sample` 可由 Admin **在线编辑**；种子数据仅用于初始化，后续以 Admin 配置为准。`id` 创建后不可修改；删除建议软删 `status=archived`。

**完整记录结构（Node 数据库）**：

```json
{
  "id": "tpl_official_first_course",
  "template_type": "首次病程记录",
  "audience": "professional",
  "tag": "official",
  "name": "首次病程记录",
  "user_id": null,
  "fields": [],
  "sample": "...",
  "status": "active",
  "created_at": "2026-06-24T00:00:00.000Z",
  "updated_at": "2026-06-24T00:00:00.000Z",
  "updated_by": null
}
```

> API 请求/响应层可使用 camelCase 映射；**持久化层统一 snake_case**。

自用模板：`user_id` 为创建者 ID，`id` 为 `tpl_user_{uuid}`，`tag` 固定 `custom`。

#### 4.0.1 模板 ID 规则

| 类型 | 格式 | 示例 | 生成方 |
|------|------|------|--------|
| 官方模板 | `tpl_official_{type_key}` | `tpl_official_first_course` | 种子数据/迁移脚本 |
| 自用模板 | `tpl_user_{uuid}` | `tpl_user_7f3a9c2e-...` | Node 保存时生成 |

**type_key 对照表**：

| 模板类型 | type_key |
|----------|----------|
| 通用 | `general` |
| 出院医嘱 | `discharge_order` |
| 门诊记录 | `outpatient_record` |
| 普通查房 | `ward_round` |
| 出院小结 | `discharge_summary` |
| 上级医生查房 | `senior_round` |
| 首次病程记录 | `first_course` |
| 大病历 | `admission_note` |
| 72小时谈话记录 | `talk_72h` |
| 会诊记录 | `consultation` |

#### 4.0.2 模板标签与可见性

| 标签值 | 中文 | 含义 | 列表可见（UI） | API 调用 | 可编辑 |
|--------|------|------|----------------|----------|--------|
| `official` | 官方 | 系统预置 | `professional` 模板：未连设备可**隐藏**；连设备后展示 | 需**会员**；**不要求**连设备 | Admin |
| `custom` | 自用 | 用户创建 | 仅创建者 | 需**会员** | 创建者 |

#### 4.0.3 产品定位与文案

- 对外默认：**「内容整理工具」**，不出现医疗专属定位
- 连上蓝牙设备后：前端文案切换为专业场景表述（**仅 UI**，不作为 API 门槛）
- 与 `PRODUCT_POSITIONING_AND_TEMPLATE_ACCESS.md` 差异：以本文为准——**会员** gating API，**设备** gating 列表展示与文案

> Phase 2 首测仅种子化 §4.1；其余官方模板特征表补齐前，Template Agent 的 `baselineFields` 仅「首次病程记录」可用。

---

### 4.1 首次病程记录（官方）

**字段说明**

| 字段名称 | 内容 |
| ---- | ------ |
| 模板 ID | `tpl_official_first_course` |
| 模板类型 | 首次病程记录 |
| 模板标签 | official（官方） |
| 模板名称 | 首次病程记录 |

**特征表（JSON，种子数据）**：

```json
{
  "templateType": "首次病程记录",
  "fields": [
    { "module": "病例特点", "key": "general_info", "label": "一般情况", "type": "string", "is_required": true, "description": "提取患者、性别、年龄" },
    { "module": "病例特点", "key": "chief_complaint", "label": "主诉", "type": "string", "is_required": true, "description": "20字以内简要概括此次发病主要症状" },
    { "module": "病例特点", "key": "present_illness", "label": "现病史", "type": "text", "is_required": true, "description": "详细描述此次发病过程" },
    { "module": "病例特点", "key": "past_history", "label": "既往史", "type": "text", "is_required": false, "description": "既往疾病史、用药史" },
    { "module": "病例特点", "key": "physical_exam", "label": "体格检查", "type": "text", "is_required": true, "description": "生命体征与诊断相关查体；阴性体征保留简要描述" },
    { "module": "病例特点", "key": "auxiliary_exam", "label": "辅检结果", "type": "array", "is_required": false, "description": "每项结果前须含时间与地点" },
    { "module": "初步诊断", "key": "primary_diagnosis", "label": "主诊断", "type": "string", "is_required": true, "description": "核心主要诊断" },
    { "module": "初步诊断", "key": "secondary_diagnosis", "label": "次诊断", "type": "array", "is_required": false, "description": "次要诊断列表" },
    { "module": "诊断依据", "key": "history_basis", "label": "病史特点", "type": "string", "is_required": true, "description": "概括性描述，如「中年男性，急性起病」" },
    { "module": "诊断依据", "key": "disease_features", "label": "疾病特征", "type": "string", "is_required": true, "description": "疾病特征性表现及发展过程" },
    { "module": "诊断依据", "key": "exam_basis", "label": "查体依据", "type": "string", "is_required": false, "description": "与诊断强相关的阳性体征" },
    { "module": "诊断依据", "key": "auxiliary_basis", "label": "辅检依据", "type": "string", "is_required": false, "description": "仅概括性阳性结果，不罗列原始数值" },
    { "module": "鉴别诊断", "key": "differential_list", "label": "鉴别项目", "type": "array", "is_required": false, "description": "针对主诊断的鉴别诊断列表" },
    { "module": "诊疗计划", "key": "nursing_monitoring", "label": "护理与监测", "type": "string", "is_required": false, "description": "护理级别、饮食及监测要求" },
    { "module": "诊疗计划", "key": "further_exam", "label": "进一步检查", "type": "string", "is_required": false, "description": "入院后需完善的检查项目" },
    { "module": "诊疗计划", "key": "treatment_principle", "label": "治疗原则", "type": "string", "is_required": false, "description": "对因对症治疗方案" },
    { "module": "诊疗计划", "key": "patient_education", "label": "知识宣教", "type": "string", "is_required": false, "description": "患者宣教内容" }
  ]
}
```

**样例**：

```
病例特点:
1.患者，男，54岁，因"口干多饮多尿体重减轻4月余，乏力半月余"入院;
2.患者4月余前无明显诱因下一个月内体重下降10kg(2024.12-2025.01体重从90kg下降至80kg左右)，伴口干，多饮，5-10L每天，多尿，夜尿2-3次每天，无泡沫尿，无恶心呕吐、心慌发抖，无视物模糊、手足麻木等症状，未予重视，未就诊。半月前患者无明显诱因下出现乏力，口干多饮多尿症状同前，昨日外院测血糖高(数值不可测得)，无明显不适.
3.既往:高血压40年，最高血压160/110mmHg，口服络活喜降压治疗，平素血压150-160/80-90mmHg。高尿酸10年余，口服非布司他降尿酸。
4.查体:血压:152/92mmHg,脉搏:71次/分钟,体温(耳):37.4°C,呼吸:20次/分钟,身高:174cm,体重:78.2Kg,体重指数:25.8。腰围92cm。神清，精神可，全身浅表淋巴结未触及肿大，胸廓无畸形，双肺呼吸音清，未闻及干湿啰音，心界无扩大，心律齐，心前各瓣膜区未闻及病理性杂音。腹膨隆，无压痛反跳痛，肝脾肋下未及。双下肢无浮肿，双侧足背动脉搏动正常可及。双侧肢体温度觉、痛觉、压力觉、位置觉、振动觉未见明显异常
5.辅助检查:2025-3-13外院胸部CT:两肺少许微小结节灶伴部分纤维增殖灶，建议年度复查。冠状动脉钙化，建议冠脉CTA检查。入院随机血糖:血糖:29.7mmol/L。
初步诊断:
糖尿病
	2型?
	1型?
	特殊类型?
高血压2级 很高危
高尿酸血症 
两肺小结节
冠状动脉钙化
诊断依据：
患者中年男性，因"口干多饮多尿体重减轻4月余，乏力半月余"入院。患者既往高血压，高尿酸血症病史。患者4月余前无明显诱因下一个月内体重下降10kg(2024.12-2025.01体重从90kg下降至80kg左右)，伴口干，多饮，5-10L每天，多尿，夜尿2-3次每天，无泡沫尿，无恶心呕吐、心慌发抖，无视物模糊、手足麻木等症状，未予重视，未就诊。半月前患者无明显诱因下出现乏力，口干多饮多尿症状同前，昨日外院测血糖高(数值不可测得)，无明显不适，为进一步诊治来我院。2025-3-13外院胸部CT:两肺少许微小结节灶伴部分纤维增殖灶，建议年度复查。冠状动脉钙化，建议冠脉CTA检查。入院随机血糖:血糖:29.7mmol/L。
鉴别诊断:
1.2型糖尿病:多中年起病，一般起病缓慢，三多一少症状可不显著，无自发酮症倾向，可有糖尿病家族史，胰岛素分泌减少伴胰岛素抵抗，起病时一般不依赖胰岛素治疗。2.1型糖尿病:一般起病较急，青少年起病，三多一少症状明显，有自发酮症倾向，体型常消瘦，胰岛素分泌绝对缺乏，依赖胰岛素治疗，糖尿病自身抗体阳性。3.成人迟发性自身免疫性糖尿病:主要分为两期:非胰岛素依赖期:临床表现貌似T2DM，但三多一少症状较典型T2DM明显，发病6个月内无酮症，血浆C肽水平较低，血糖短期内可用饮食和(或)口服降糖药控制。胰岛素依赖期:自起病后半年至数年后，出现胰岛B细胞功能进行性损伤，最终依靠胰岛素治疗，并出现酮症倾向。
诊疗计划(包括可衡量的目标和出院计划):
1.内科护理常规，二级护理，糖尿病饮食;
2.完善三大常规、胸部CT、血管b超、24小时尿蛋白定量、肌电图、血管超声等并发症筛查;
3.治疗上予胰岛素泵(基础量9-24点0.5u/h，基础量4-9点0.4u/h，基础量0-4点0.4u/h)+[锐舒霖]门冬胰岛素针(预充)4iu皮下注射每日三次控制血糖。根据血糖及检查结果调整治疗方案。
4.可衡量的目标和出院计划:住院期间进行糖尿病饮食指导，知晓糖尿病相关知识，出院后糖尿病饮食控制，规律用药，定期监测血糖，注意低血糖，知晓低血糖应对方法，内分泌科门诊定期随访。
入院时在使用的治疗性药物：有，络活喜每日一次每次1颗，非布司他每日一次每次0.5颗
成瘾药物:无
```

---

### 4.2 出院医嘱（官方）

| 字段名称 | 内容 |
| ---- | ----- |
| 模板 ID | `tpl_official_discharge_order` |
| 模板类型 | 出院医嘱 |
| 模板标签 | official |
| 模板名称 | 出院医嘱 |

特征表、样例：待后续补充。

### 4.3 门诊记录（官方）

| 字段名称 | 内容 |
| ---- | ---- |
| 模板 ID | `tpl_official_outpatient_record` |
| 模板类型 | 门诊记录 |
| 模板标签 | official |
| 模板名称 | 门诊记录 |

特征表、样例：待后续补充。

### 4.4 普通查房（官方）

| 字段名称 | 内容 |
| ---- | ---- |
| 模板 ID | `tpl_official_ward_round` |
| 模板类型 | 普通查房 |
| 模板标签 | official |
| 模板名称 | 普通查房 |

特征表、样例：待后续补充。

### 4.5 上级医生查房（官方）

| 字段名称 | 内容 |
| ---- | ------ |
| 模板 ID | `tpl_official_senior_round` |
| 模板类型 | 上级医生查房 |
| 模板标签 | official |
| 模板名称 | 上级医生查房 |

特征表、样例：待后续补充。

### 4.6 出院小结（官方）

| 字段名称 | 内容 |
| ---- | ---- |
| 模板 ID | `tpl_official_discharge_summary` |
| 模板类型 | 出院小结 |
| 模板标签 | official |
| 模板名称 | 出院小结 |

特征表、样例：待后续补充。

### 4.7 大病历（官方）

| 字段名称 | 内容 |
| ---- | ---- |
| 模板 ID | `tpl_official_admission_note` |
| 模板类型 | 大病历 |
| 模板标签 | official |
| 模板名称 | 大病历 |

特征表、样例：待后续补充。

### 4.8 72小时谈话记录（官方）

| 字段名称 | 内容 |
| ---- | -------- |
| 模板 ID | `tpl_official_talk_72h` |
| 模板类型 | 72小时谈话记录 |
| 模板标签 | official |
| 模板名称 | 72小时谈话记录 |

特征表、样例：待后续补充。

### 4.9 会诊记录（官方）

| 字段名称 | 内容 |
| ---- | ---- |
| 模板 ID | `tpl_official_consultation` |
| 模板类型 | 会诊记录 |
| 模板标签 | official |
| 模板名称 | 会诊记录 |

特征表、样例：待后续补充。

---

## 5. Agent 间协作流程

> 入口 A 的等效流程由前端分步调用单 Agent API 完成；以下描述入口 B（Orchestrator）路径。

### 5.1 流程 1：图片识别并整理

用户：上传检查报告图片，要求「识别并整理成门诊记录」

Orchestrator:
1. 识别意图：`ocr + text` 整理
2. 调用 OCR Agent
3. 将 OCR 结果传给 Text Agent（`organize` 模式）
4. 返回最终结果

数据流：
```
图片 → OCR Agent → {text: "识别文本"}
     → Text Agent → {resultText, bodyText, confirmItems}
     → Orchestrator → 返回用户
```

### 5.2 流程 2：多图片合并识别

用户：上传多张报告图片，要求「全部识别并合并」

Orchestrator:
1. 识别意图：多个 OCR 并行执行
2. 并行调用 OCR Agent（多次）
3. 合并所有文本
4. 可选：调用 Text Agent 整理
5. 返回结果

数据流：
```
图片1 ┐
图片2 ├→ OCR Agent (并行) → 文本1, 文本2, 文本3
图片3 ┘                      ↓
                        合并文本
                            ↓
                    (可选) Text Agent
                            ↓
                        返回用户
```

### 5.3 流程 3：录音+图片组合处理

用户：上传一段录音和一张报告，要求「整理成完整记录」

Orchestrator:
1. 识别意图：ASR + OCR 并行，然后合并整理
2. 并行调用 ASR Agent 和 OCR Agent
3. 将两者结果传给 Text Agent（合并整理）
4. 返回结果

数据流：
```
录音 ┐
    ├→ ASR → 转写文本 ┐
图片 ┘                ├→ Text Agent → 返回
    └→ OCR → 识别文本 ┘
```

### 5.4 流程 4：从内容生成模板

用户：提供一份病历，要求「做成模板，以后可以快速生成类似记录」

Orchestrator:
0. 若用户未指定类型，追问 `templateType`；否则 Node 注入对应官方 `baselineFields`
1. 识别意图：模板创作
2. 如果内容是图片，先调用 OCR Agent
3. 将文本传给 Template Agent（带 `templateType` + `baselineFields`）
4. 返回 `templateDraft`；用户确认后由 Node 保存

数据流：
```
选择 templateType → Node 注入 baselineFields
内容（文本/图片）→ (OCR?) → Template Agent → templateDraft → 用户保存 → Node 落库
```

---

## 6. 技术实现方案

### 6.1 独立 Agent 服务

**架构概览**：

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            小程序前端                                     │
│                              HTTP 请求                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
┌──────────────────────────────┐    ┌──────────────────────────────────┐
│      Node.js 后端             │    │   独立 Agent 服务 (Python FastAPI) │
│  业务逻辑、用户管理、模板 CRUD  │◄───┤   OCR / ASR / Text / Template    │
│  /api/*                       │    │   Orchestrator                   │
└──────────────────────────────┘    └──────────────────────────────────┘
                                            │
                            ┌───────────────┼───────────────┐
                            ▼               ▼               ▼
                    ┌───────────┐   ┌───────────┐   ┌───────────┐
                    │ OCR Agent │   │ ASR Agent │   │Text Agent │
                    │QwenVL-OCR │   │Qwen3-ASR  │   │AI 网关    │
                    └───────────┘   └───────────┘   │default-chat│
                                                    └───────────┘
                                                            │
                                                    ┌───────┴────────┐
                                                    ▼                ▼
                                            ┌───────────┐   ┌───────────┐
                                            │Template AG│   │Orchestrator│
                                            │default-chat│  │default-chat│
                                            └───────────┘   └───────────┘
```

**独立服务目录结构**：

```
agent-service/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI 服务入口
│   ├── config.py               # 配置管理
│   ├── api/
│   │   ├── routes.py           # 路由定义
│   │   └── models.py           # 请求/响应模型
│   ├── agents/
│   │   ├── base.py             # Agent 基类
│   │   ├── orchestrator.py
│   │   ├── ocr.py
│   │   ├── asr.py
│   │   ├── text.py
│   │   └── template.py
│   ├── clients/
│   │   ├── chat.py
│   │   ├── dashscope.py
│   │   └── backend.py
│   ├── prompts/
│   │   ├── orchestrator.txt
│   │   ├── text.txt
│   │   └── template.txt
│   ├── middleware/
│   │   └── auth.py             # 认证；脱敏由 Node 完成，Agent 信任内网已脱敏输入
│   └── utils/
│       └── logger.py
├── tests/
├── requirements.txt
├── Dockerfile
└── .env.example
```

> OCR/ASR 无独立 Prompt 文件；主链路为 DashScope API 直调。

**通信协议**：

```yaml
# Node.js 后端 → Agent 服务
POST http://agent-service:8000/v1/agent/{type}
Authorization: Bearer <SHARED_API_KEY>
X-User-ID: <user_id>
X-Request-ID: <trace_id>
Content-Type: application/json

{
  "userContext": {
    "userId": "...",
    "memberStatus": "active|inactive",
    "deviceStatus": "connected|disconnected"
  },
  "data": { ... }
}

# 响应
{
  "success": true,
  "result": {},
  "agent": "调用的Agent名称",
  "duration": 1200
}
```

### 6.2 Node.js 后端改动

**新增模块** `backend/src/modules/agent-proxy.js`：会员校验 → **脱敏** → 代理至 Agent 服务。Agent 服务不可用时返回 **5xx 硬失败**，不回退旧 `provider-gateway` AI 逻辑。

**新 API**：

```javascript
POST /api/agent/chat      → /v1/agent/chat      // 入口 B
POST /api/agent/ocr       → /v1/agent/ocr
POST /api/agent/asr       → /v1/agent/asr
POST /api/agent/text      → /v1/agent/text       // 入口 A 文本类
POST /api/agent/template  → /v1/agent/template
GET  /api/templates       → 模板列表（新模型）
GET  /api/templates/:id   → 模板详情
POST /api/templates       → 保存自用模板（Agent 草稿落库）
PUT  /api/admin/templates/:id  → Admin 维护官方 fields/sample
```

**一次性废弃（同版本发布，不保留兼容）**：

| 废弃 API / 模块 | 说明 |
|-----------------|------|
| `GET /api/ai/modes` | `smart-creation.js` |
| `GET /api/ai/quick-actions` | `store.quickActions`、Admin 快捷任务 |
| `POST/GET/DELETE /api/ai/user-templates` | 改用 template Agent + `/api/templates` |
| `POST /api/ai/templates/:id/generate` | 填表生成废弃 |
| `GET /api/ai/templates`（旧结构） | 改用 `/api/templates` |
| `POST /api/ai/assistant` | 改用 `/api/agent/text` 或 `/api/agent/chat` |
| `variableDefs` / `templateCode` / `promptContent`（旧模板字段） | 改用 `fields` + `sample` |

OCR/ASR 路径 `POST /api/ocr/recognize`、`POST /api/asr/transcribe` 可保留 URL，**实现改为代理** Agent 服务（非兼容层，直接切换实现）。

### 6.3 配置项

**独立服务配置**（`agent-service/.env`）：

```bash
# 服务配置
SERVICE_PORT=8000
SERVICE_HOST=0.0.0.0
LOG_LEVEL=INFO

# Node.js 后端
BACKEND_URL=http://localhost:8080
BACKEND_API_KEY=shared_secret_key

# 模型（默认继承 AI_MODEL；可单独覆盖）
ORCHESTRATOR_MODEL=
TEXT_MODEL=
TEMPLATE_MODEL=

# OpenAI 兼容 AI 网关（与 Node backend AI_* 一致）
AI_PROVIDER=openai-compatible
AI_BASE_URL=https://your-ai-gateway.example.com
AI_CHAT_COMPLETIONS_URL=
AI_API_KEY=your-provider-key
AI_MODEL=default-chat-model
AI_TIMEOUT_MS=60000

# DashScope (OCR/ASR)
DASHSCOPE_API_KEY=sk-xxx
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com

# OCR
OCR_MODEL=qwen-vl-ocr-2025-11-20
OCR_TASK=text_recognition
OCR_TIMEOUT=60000
OCR_MAX_BYTES=5242880

# ASR
ASR_MODEL=qwen3-asr-flash
ASR_TIMEOUT=600000
ASR_MAX_BYTES=62914560

# Orchestrator 编排超时
ORCHESTRATOR_TIMEOUT=120000

# 对话上下文（会话级）
SESSION_CONTEXT_TTL=7200
```

**Agent 超时配置（已确认）**：

| Agent | 超时 |
|-------|------|
| OCR | 60s |
| ASR | 600s |
| Text | 60s |
| Template | 60s |
| Orchestrator（整链） | 120s |

**Node.js 后端配置**（`config.js` 新增）：

```javascript
const config = {
  agentServiceEnabled: readBoolean(process.env.AGENT_SERVICE_ENABLED, false),
  agentServiceUrl: process.env.AGENT_SERVICE_URL || 'http://localhost:8000',
  agentServiceApiKey: process.env.AGENT_SERVICE_API_KEY || '',
  agentServiceTimeout: Number(process.env.AGENT_SERVICE_TIMEOUT || 120000)
};
```

### 6.4 核心接口设计

**Agent 服务接口**：

```yaml
# 统一智能入口（入口 B，Orchestrator）
POST /v1/agent/chat
Request:
  message: string
  attachments: [{type, data}]
  context: {conversationHistory, userId, memberStatus, deviceStatus}
Response:
  response: string
  workflow: {type, steps}
  results: {agentName: {...}}
  finalResult: {}

# OCR Agent（入口 A 可直连）
POST /v1/agent/ocr
Request: {image, options}
Response: {text, structured, confidence, issues}

# ASR Agent
POST /v1/agent/asr
Request: {audio, options}
Response: {text, segments, duration, warnings}

# Text Agent
POST /v1/agent/text
Request:
  text: string
  task: organize|polish|extract|convert|review
  mode: general|professional
  template: {id, templateType, name, fields, sample}  # 可选
  baselineFields: {}                                   # 可选
Response:
  resultText: string
  bodyText: string
  confirmItems: string[]

# Template Agent
POST /v1/agent/template
Request:
  templateType: string
  content: string
  baselineFields: {templateType, fields}
  templateName: string
  options: {allowExtraFields, rejectNonMedical}
Response:
  success: boolean
  templateDraft: {templateType, tag, name, fields, sample}
  warnings: string[]
```

### 6.5 服务间通信安全

```yaml
# Node.js → Agent 服务
Headers:
  Authorization: Bearer <SHARED_API_KEY>
  X-Request-ID: <trace_id>
  X-User-ID: <user_id>

# Agent 服务 → Node.js（查询用户/模板）
Headers:
  Authorization: Bearer <SHARED_API_KEY>
  X-Request-ID: <trace_id>

# 响应 Headers
  X-Request-ID: <trace_id>
  X-Agent-Name: <调用的Agent名称>
  X-Duration-Ms: <处理耗时>
```

---

## 7. 数据流与安全性

### 7.1 数据流向

```
用户输入
   ↓
[输入层] 格式/大小校验（Node）
   ↓
[脱敏层] Node agent-proxy 统一脱敏后再转发（Agent 服务不重复脱敏）
   ↓
[路由层]
   ├─ 入口 A → 直连指定 Agent（不经 Orchestrator）
   └─ 入口 B → Orchestrator 决策与编排（可多 Agent 自动串联，每步 LLM 前脱敏）
   ↓
[执行层] OCR / ASR / Text / Template Agent
   ↓
[整合层] Orchestrator 合并（仅入口 B）或单 Agent 直返（入口 A）
   ↓
[输出层] 返回用户；模板等经用户显式保存后由 Node 业务 API 落库
```

### 7.2 安全原则

| 层级 | 安全措施 |
|------|----------|
| 输入层 | 大小限制（图片 5MB，音频 60MB）；格式验证；恶意内容检测 |
| 脱敏层 | AI 调用前自动脱敏；私有信息替换；脱敏日志（不记录原文） |
| Agent 层 | 每次调用独立上下文；不持久化用户医疗内容；分 Agent 超时保护 |
| 输出层 | AI 原始输出默认不落库；用户显式「保存模板」或「确认发送」的内容由 Node 落库；日志不记录敏感原文 |

### 7.3 入口 A / B 体验与安全差异

| 入口 | 页面 | 多步链路 | 脱敏 | 中间页 | 发送确认 |
|------|------|----------|------|--------|----------|
| 入口 A | OCR/ASR/结果页/模板创作等 | 用户显式分步 | Node | 保留 OCR/ASR 确认页 | editor 确认后发送 |
| 入口 B | `pages/ai/detail` | Orchestrator 自动串联 | Node | **跳过** OCR/ASR 确认页，直接 `finalResult` | editor 确认后发送 |

### 7.4 会员与设备权限矩阵

| API | 需有效会员 | 需连设备（API 层） |
|-----|------------|-------------------|
| `POST /api/agent/ocr` | 是 | 否 |
| `POST /api/agent/asr` | 是 | 否 |
| `POST /api/agent/text` | 是 | 否 |
| `POST /api/agent/template` | 是 | 否 |
| `POST /api/agent/chat` | 是 | 否 |
| `GET /api/templates`（含 professional） | 是 | 否（未连设备可 UI 过滤列表） |

---

## 8. 开发阶段规划

### Phase 1：Agent 服务基础框架

**目标**：搭建独立 Agent 服务骨架

**任务**：
- [ ] 创建 `agent-service` 项目（Python FastAPI）
- [ ] Agent 基类、Chat/DashScope 客户端、配置、路由、日志
- [ ] 健康检查接口

**验收**：服务可启动；可成功调用 AI 网关（`default-chat-model`）

### Phase 2：核心 Agent + 首次病程首测

**目标**：Text / Template Agent 可用；首次病程种子就绪；入口 A 文本链路可测

**任务**：
- [ ] Text Agent（五种 task、general/professional、`resultText/bodyText/confirmItems`）
- [ ] Template Agent（基线扫描、特征提取；库内 `is_required` snake_case）
- [ ] Node 模板模块重构；种子 `tpl_official_first_course`；Admin 可编辑官方模板
- [ ] Prompt：`text.txt`、`template.txt`
- [ ] **入口 A**：OCR/ASR 结果页「智能整理」（五 task）；`asr → text(with template)`；`ocr → template` 保存流
- [ ] **普通用户**：仅测五 task，无模板
- [ ] **专业用户**：`organize` + 首次病程模板

**验收**：
- 首次病程范文 → 自用模板 → Text 按模板整理
- 普通用户五 task 可用；专业首次病程模板可用
- 旧 modes/quickActions/generateTemplate API 已移除

### Phase 3：OCR/ASR Agent 封装

**目标**：DashScope OCR/ASR 封装为 Agent

**任务**：
- [ ] OCR Agent（QwenVL-OCR、结构化解析）
- [ ] ASR Agent（Qwen3-ASR、标点、说话人可选）
- [ ] 单元测试

**验收**：OCR/ASR 识别与转写正常

### Phase 4：Node.js 后端集成

**任务**：
- [ ] `agent-proxy.js`（会员 + 脱敏 + 代理 + 硬失败）
- [ ] `/api/agent/*`、`/api/templates`；一次性移除 §6.2 废弃 API
- [ ] 移除 `smart-creation`、`quickActions` 种子与 Admin 快捷任务页
- [ ] OCR/ASR 路由改代理 Agent 服务

**验收**：小程序经 Node 可调用 Agent 服务；旧 AI 辅助 API 已删除

### Phase 5：Orchestrator + 入口 B 对话页

**任务**：
- [ ] Orchestrator、工作流引擎、`/api/agent/chat`
- [ ] **重写** `pages/ai/detail` 为入口 B（自然语言、附件、`finalResult` 直出）
- [ ] 会话上下文：**单实例内存**，TTL 2h
- [ ] `prompts/orchestrator.txt`

**验收**：§5 四条协作流程在入口 B 可跑通；对话内直接展示整理结果

### Phase 6：生产化

**任务**：
- [ ] SSE 流式响应
- [ ] 监控追踪、Docker（会话仍用内存，扩容接受丢上下文）
- [ ] 用户自定义 Prompt（范围 Phase 6 细化）
- [ ] Agent 服务层错误重试；**不回退** Node 旧 gateway

### Phase 7：小程序全面适配

**任务**：
- [ ] 入口 A 各页改调 `/api/agent/*`；移除 modes/quickActions 前端服务
- [ ] 模板列表/创作页适配新 `fields`+`sample` 模型
- [ ] 连设备后专业文案；professional 模板列表 UI 过滤
- [ ] editor → 蓝牙发送流程保持不变

**验收**：入口 A/B 可用；旧智能创作交互已移除

---

## 9. 已确认事项

| 类别 | 结论 |
|------|------|
| Agent 服务 | Python FastAPI；不可用则 **硬失败** |
| Orchestrator 模型 | `default-chat-model`（OpenAI 兼容网关，与 Node `AI_MODEL` 一致） |
| 流式响应 | Phase 6 SSE |
| 对话上下文 | 会话级；**单实例内存**；TTL 2h |
| Agent 超时 | OCR/Text/Template 60s；ASR 600s；Orchestrator 120s |
| 老数据 | 不迁移，一次性废弃旧 API |
| 入口 A | 功能页按钮 → 直连 `/api/agent/{ocr\|asr\|text\|template}` |
| 入口 B | **`pages/ai/detail` 重写** → `/api/agent/chat`；原 modes/quickActions/assistant **废弃** |
| 入口 B 结果 | 自动串联，**直接 `finalResult`**，跳过 OCR/ASR 确认页 |
| quickActions | **废弃**；并入 Text Agent `task` + `template` |
| 填表 generateTemplate | **废弃** |
| 通用成稿（通知/邮件/汇报） | `task=convert`，Phase 2 **无专用模板** |
| 模板 ID | `tpl_official_*` / `tpl_user_*`；**废弃 templateCode** |
| 库内 JSON | **snake_case**（`is_required` 等） |
| 10 种医疗模板 | 本次均为 `audience: professional`；后续扩展 |
| 「通用」类型 | 用户自建模板选用；无官方种子 |
| Phase 2 普通用户 | 只测五 `task`，不测模板 |
| Phase 2 专业 | 首次病程 `tpl_official_first_course` |
| 无种子模板类型 | `organize` + `professional` 通用 Prompt，不报错 |
| Admin | 可在线维护官方 `fields` / `sample` |
| 权限 | 全部 Agent API **需会员**；API **不要求**连设备；professional 列表可 UI 隐藏 |
| 脱敏 | **仅 Node** 代理层 |
| 产品文案 | 默认「内容整理工具」；连设备后专业文案 |
| 用户自定义 Prompt | Phase 6 |

---

## 10. 关联文档

| 文档 | 状态 |
|------|------|
| `docs/QUICK_ACTION_DESIGN.md` | **已废弃**，由本文 §2 入口 A/B 与 Text Agent task 替代 |
| `docs/PRODUCT_POSITIONING_AND_TEMPLATE_ACCESS.md` | 权限以本文 §7.4、§4.0.3 为准，需后续同步 |
| `docs/SECURITY_AI_DATA_BOUNDARY.md` | 脱敏仍在 Node；入口 B 发送前仍须 editor 确认 |
