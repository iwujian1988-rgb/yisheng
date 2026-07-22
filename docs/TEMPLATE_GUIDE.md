# 小科打字猿 — 模板创建指南

本文档供 AI 助手参考，用于生成可导入后台的模板定义。

---

## 模板是什么

用户通过微信小程序选择一个模板，填写几个字段（如主题、内容、时间），系统将零散输入整理成结构化文本，用户确认后通过 BLE 设备发送到电脑。

模板的核心作用：**把口语化、零散的用户输入变成结构清晰、可直接使用的工作文本。**

---

## 模板字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `templateCode` | string | 是 | 唯一标识，英文+数字+下划线/短横线，3-64字符，如 `meeting_summary` |
| `name` | string | 是 | 显示名称，如"会议纪要" |
| `description` | string | 否 | 一句话描述模板用途 |
| `category` | string | 否 | 分类标签，如 `record`、`report`、`followup` |
| `audience` | string | 否 | `"general"`（所有用户）或 `"professional"`（仅会员），默认 `general` |
| `scene` | string | 否 | 使用场景，如"会后整理" |
| `variableDefs` | array | 否 | 用户填写的字段定义（见下方） |
| `outputStructure` | array | 否 | AI 输出的段落结构（见下方） |
| `promptContent` | string | 否 | 自定义 AI 提示词（见下方） |
| `qualityRules` | array | 否 | 质量检查规则（见下方） |
| `missingInfoRules` | array | 否 | 缺失信息处理规则（见下方） |
| `forbiddenRules` | array | 否 | 禁止规则（见下方） |

---

## variableDefs — 用户填写字段

定义用户需要填写的输入项。每个字段：

```json
{
  "key": "mainInfo",
  "label": "主要内容",
  "type": "textarea",
  "required": true,
  "placeholder": "请输入要整理的内容"
}
```

- `key`：变量名，英文，用于系统内部引用
- `label`：显示给用户的标签，如"关键内容"、"时间地点"
- `type`：`"input"`（单行）或 `"textarea"`（多行，默认）
- `required`：是否必填。必填项为空时 AI 仍会生成，但【待确认】会提示补充
- `placeholder`：输入框占位提示文字

**原则**：字段宜少不宜多，3-6 个为佳。用户在手机上操作，字段越少体验越好。

---

## outputStructure — 输出段落结构

告诉 AI 正文应该按什么结构组织，是一个字符串数组：

```json
["主要信息", "时间线", "关键数据", "待确认事项"]
```

AI 会按这个顺序生成正文段落。如果不设置，AI 会按 variableDefs 的 label 顺序排列。

**原则**：段落名要具体，让 AI 清楚每段该放什么内容。

---

## promptContent — 自定义 AI 指令

这是最关键的字段。告诉 AI 这个模板的特殊处理规则。

示例：
```
你是一个会议纪要整理助手。
将口语化的会议记录整理为正式纪要格式。
发言内容按发言人归类，提炼核心观点，去除语气词和重复内容。
时间、地点、参会人作为开头信息独立列出。
决策事项用编号列表，明确责任人和截止日期。
```

**原则**：
- 明确角色（"你是…助手"）
- 明确输入→输出的转换规则
- 不要写太长，3-8 行为佳
- 不要写"输出【正文】和【待确认】"——系统会自动添加

---

## qualityRules — 质量检查规则

AI 生成后需要遵守的质量要求：

```json
[
  "保留原始事实边界，不扩展用户未提及的内容",
  "数字、日期、人名必须与原文完全一致",
  "口语化表达转为书面语，但不改变原意"
]
```

---

## missingInfoRules — 缺失信息处理规则

当用户没有提供某些信息时，AI 应该怎么处理：

```json
[
  "未提供的信息标记为「待补充」，不能猜测或编造",
  "缺失的关键数字放入【待确认】"
]
```

---

## forbiddenRules — 禁止规则

明确告诉 AI 不能做什么：

```json
[
  "不得新增用户未提供的任何事实",
  "不得输出法律、医疗等专业性承诺或建议",
  "不得在正文中添加解释性说明"
]
```

---

## API 调用方式

### 创建模板

```
POST /api/admin/templates
Authorization: Bearer <管理员token>
Content-Type: application/json
```

### 示例：创建一个"会议纪要"模板

```json
{
  "templateCode": "meeting_minutes",
  "name": "会议纪要",
  "description": "将会议记录整理为结构化纪要",
  "category": "record",
  "audience": "general",
  "scene": "会后整理",
  "variableDefs": [
    {
      "key": "meetingTopic",
      "label": "会议主题",
      "type": "input",
      "required": true,
      "placeholder": "本次会议讨论什么"
    },
    {
      "key": "meetingTime",
      "label": "时间地点",
      "type": "input",
      "required": false,
      "placeholder": "如：6月11日下午3点 会议室A"
    },
    {
      "key": "attendees",
      "label": "参会人员",
      "type": "input",
      "required": false,
      "placeholder": "如：张三、李四、王五"
    },
    {
      "key": "rawNotes",
      "label": "会议记录",
      "type": "textarea",
      "required": true,
      "placeholder": "粘贴或输入会议中的零散记录"
    }
  ],
  "promptContent": "你是一个会议纪要整理助手。将口语化的会议记录整理为正式纪要。\n发言内容按主题归类，提炼核心观点，去除语气词和重复。\n时间地点参会人作为开头信息列出。\n决策事项用编号列表，明确责任人和截止日期。",
  "outputStructure": [
    "基本信息",
    "讨论内容",
    "决策事项",
    "后续行动"
  ],
  "qualityRules": [
    "发言人与发言内容必须对应正确",
    "决策事项必须有明确的执行人",
    "时间日期与原文一致"
  ],
  "missingInfoRules": [
    "未提供参会人员则标注「待补充」",
    "缺失的决策细节放入【待确认】"
  ],
  "forbiddenRules": [
    "不得编造未讨论的话题",
    "不得擅自添加行动项的截止日期"
  ]
}
```

### 创建后发布

模板创建后状态为 `draft`，需要单独发布：

```
PATCH /api/admin/templates/<模板id>
Authorization: Bearer <管理员token>
Content-Type: application/json

{"status": "published"}
```

---

## 设计原则总结

1. **只整理，不创造**：AI 只能重组用户输入，不能新增内容
2. **字段精简**：手机端填写，3-6 个字段最佳
3. **结构明确**：outputStructure 让输出可预测
4. **规则兜底**：qualityRules + missingInfoRules + forbiddenRules 三层保护
5. **先 draft 再 publish**：创建后可预览效果，确认后再发布

---

## 常见模板类型参考

| 类型 | templateCode 示例 | 场景 |
|------|-------------------|------|
| 会议纪要 | `meeting_minutes` | 会后整理记录 |
| 工作日报 | `daily_report` | 每日工作总结 |
| 客户跟进 | `customer_followup` | 拜访/通话后记录 |
| 项目汇报 | `project_update` | 阶段性进展汇报 |
| 培训记录 | `training_record` | 培训内容整理 |
| 数据报告 | `data_report` | 数据指标说明 |
| 物料清单 | `material_list` | 设备/物品清单整理 |
| 问题追踪 | `issue_tracking` | 问题描述与处理记录 |
