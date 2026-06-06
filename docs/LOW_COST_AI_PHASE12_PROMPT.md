# 低成本 AI Phase 12 提示词

把下面这段完整发给另一个 AI。

```text
继续参与病历传输小程序开发。请先阅读：
- docs/DEVELOPMENT_STANDARDS.md
- docs/PARALLEL_AI_WORKFLOW.md
- docs/TASK_ROADMAP.md
- docs/AI_TASK_SPLIT.md
- docs/CODE_REVIEW_CHECKLIST.md
- docs/REVIEW_LOG.md
- docs/SECURITY_AI_DATA_BOUNDARY.md

重要规则：
- 不要写页面级 mock 数据。
- 不要用 setTimeout 假装接口成功。
- 不调用真实接口。
- 不写 AI prompt。
- 不调用 DeepSeek/OCR/ASR。
- 不调用蓝牙 API。
- 不写真实联系方式、二维码、价格。
- 不写真实或仿真的病历正文、检查报告正文、患者信息。
- 下面页面的数据源、路由、服务逻辑全部由 Codex 接入。

绝对禁止修改：
- app.js
- app.json
- app.wxss
- project.config.json
- pages/home/**
- pages/login/**
- pages/register/**
- pages/forgot-password/**
- pages/account-status/**
- pages/device/device.*
- pages/device/bind.*
- pages/device/detail.*
- pages/device/checklist.*
- pages/history/**
- pages/settings/**
- pages/profile/**
- pages/help/**
- pages/common/**
- pages/ai/**
- pages/templates/index.*
- pages/templates/detail.*
- pages/templates/result.*
- pages/ocr/**
- pages/asr/**
- pages/purchase/**
- pages/support/**
- pages/tutorials/**
- pages/feedback/**
- pages/about/**
- pages/network-test/**
- pages/transfer/**
- pages/error/**
- pages/dev/**
- pages/onboarding/**
- pages/import/**
- utils/**
- services/**
- docs/**

你下一批只做低风险 UI 页面：

任务 B-042：发送前确认页 UI
只允许创建/修改：
- pages/transfer/confirm.wxml
- pages/transfer/confirm.wxss
- pages/transfer/confirm.js
- pages/transfer/confirm.json

要求：
- 展示待发送文本摘要区域、字数、来源类型、确认发送按钮、返回编辑按钮。
- text/source 由 onLoad(options) 传入，默认空字符串。
- 不写病历示例。
- 不调用蓝牙 API。
- confirmSend() 只 toast “等待接入发送确认服务”。
- 不修改 app.json。

任务 B-043：传输队列页 UI
只允许创建/修改：
- pages/transfer/queue.wxml
- pages/transfer/queue.wxss
- pages/transfer/queue.js
- pages/transfer/queue.json

要求：
- 展示当前队列状态、进度条、取消按钮。
- queueItems 默认为空数组。
- 不写传输记录 mock 数据。
- cancelQueue() 只 toast “等待接入传输队列服务”。
- 不调用蓝牙 API。
- 不调用接口。
- 不修改 app.json。

任务 B-044：系统模式说明页 UI
只允许创建/修改：
- pages/settings/system-guide.wxml
- pages/settings/system-guide.wxss
- pages/settings/system-guide.js
- pages/settings/system-guide.json

要求：
- 展示 WIN10、WIN11、RAW 三种模式说明。
- 只写通用操作说明，不写硬件协议细节。
- “选择此模式”按钮只 toast “等待接入传输设置服务”。
- 不引用 utils/ble 或 utils/encoder。
- 不调用接口。
- 不修改 app.json。

任务 B-045：AI 脱敏说明页 UI
只允许创建/修改：
- pages/ai/redaction-guide.wxml
- pages/ai/redaction-guide.wxss
- pages/ai/redaction-guide.js
- pages/ai/redaction-guide.json

要求：
- 展示脱敏处理说明、不会发送的敏感字段类型、用户确认提示。
- 不写真实患者信息。
- 不写 AI prompt。
- 不调用 AI/OCR/ASR。
- confirmRead() 只 toast “等待接入隐私服务”。
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
8. 是否调用真实接口、蓝牙 API、AI/OCR/ASR：必须回答“否”

如果你发现必须修改禁止文件，停止并说明，不要自行修改。
```
