# 低成本 AI 第五批任务提示词

把下面这段发给另一个 AI，用于第五批页面开发。

```text
继续参与病历传输小程序开发。请先阅读：
- docs/DEVELOPMENT_STANDARDS.md
- docs/PARALLEL_AI_WORKFLOW.md
- docs/TASK_ROADMAP.md
- docs/AI_TASK_SPLIT.md
- docs/CODE_REVIEW_CHECKLIST.md
- docs/REVIEW_LOG.md
- docs/SECURITY_AI_DATA_BOUNDARY.md
- docs/AI_CORE_ARCHITECTURE.md

重要规则：
- 不要写页面级 mock 数据。
- 不要用 setTimeout 假装接口成功。
- 不调用真实接口。
- 不写 AI prompt。
- 不调用 DeepSeek/OCR/ASR。
- 不写真实或仿真的病历正文、检查报告正文、患者信息。
- AI、OCR、ASR、模板生成的核心逻辑全部由 Codex 接入。

绝对禁止修改：
- app.js
- app.json
- app.wxss
- project.config.json
- pages/home/home.js
- pages/login/login.js
- pages/register/**
- pages/forgot-password/**
- pages/account-status/**
- pages/device/**
- pages/history/**
- pages/settings/**
- pages/profile/**
- pages/help/**
- pages/common/**
- pages/ai/index.*
- pages/templates/index.*
- pages/ocr/index.*
- pages/asr/index.*
- utils/**
- services/**
- docs/**

你下一批只做低风险 UI 页面：

任务 B-014：AI 对话详情页 UI
只允许创建/修改：
- pages/ai/detail.wxml
- pages/ai/detail.wxss
- pages/ai/detail.js
- pages/ai/detail.json

要求：
- 展示消息列表区域、输入区域、发送按钮。
- 消息列表默认空数组。
- 不写对话 mock 内容。
- 不写 prompt。
- sendMessage() 只 toast “等待接入 AI 服务”。
- 不调用接口。
- 不修改 app.json。

任务 B-015：模板应用结果页 UI
只允许创建/修改：
- pages/templates/result.wxml
- pages/templates/result.wxss
- pages/templates/result.js
- pages/templates/result.json

要求：
- 展示结果区域、复制按钮、发送到电脑按钮、重新生成按钮。
- 结果文本默认为空字符串。
- 不写模板结果 mock。
- 不写病历/报告样例。
- 所有按钮只保留函数入口并 toast “等待接入模板服务”。
- 不调用接口。
- 不修改 app.json。

任务 B-016：OCR 结果确认页 UI
只允许创建/修改：
- pages/ocr/result.wxml
- pages/ocr/result.wxss
- pages/ocr/result.js
- pages/ocr/result.json

要求：
- 展示图片占位区域、识别文本区域、确认使用按钮、重新识别按钮。
- 识别文本默认为空字符串。
- 不写 OCR 结果 mock。
- confirmResult() 只 toast “等待接入 OCR 服务”。
- 不调用接口。
- 不修改 app.json。

任务 B-017：ASR 结果确认页 UI
只允许创建/修改：
- pages/asr/result.wxml
- pages/asr/result.wxss
- pages/asr/result.js
- pages/asr/result.json

要求：
- 展示音频状态区域、转写文本区域、确认使用按钮、重新录音按钮。
- 转写文本默认为空字符串。
- 不写 ASR 结果 mock。
- confirmResult() 只 toast “等待接入 ASR 服务”。
- 不调用接口。
- 不修改 app.json。

交付格式：
1. 本次任务编号：
2. 修改文件：
3. 实现内容：
4. 未实现/占位内容：
5. 自检结果：
6. 是否修改了禁止文件：必须回答“否”
7. 是否写了页面级 mock：必须回答“否”
8. 是否写了 AI prompt 或调用 AI/OCR/ASR：必须回答“否”

如果你发现必须修改禁止文件，停止并说明，不要自行修改。
```

