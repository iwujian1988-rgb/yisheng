# 低成本 AI Phase 11 提示词

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
- 不写真实联系方式、二维码、价格。
- 不写真实或仿真的病历正文、检查报告正文、患者信息。
- 首次引导、设备检查、文本导入、模板详情的数据源和业务逻辑全部由 Codex 接入。

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
- pages/history/**
- pages/settings/**
- pages/profile/**
- pages/help/**
- pages/common/**
- pages/ai/**
- pages/templates/index.*
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
- utils/**
- services/**
- docs/**

你下一批只做低风险 UI 页面：

任务 B-038：首次使用引导页 UI
只允许创建/修改：
- pages/onboarding/index.wxml
- pages/onboarding/index.wxss
- pages/onboarding/index.js
- pages/onboarding/index.json

要求：
- 展示 3 个引导步骤：登录开通、绑定设备、开始传输。
- 不读取真实账号或设备状态。
- currentStep 可由 onLoad(options) 传入，默认 0。
- “下一步”“跳过”“开始使用”只保留函数入口并 toast “等待接入引导服务”。
- 不调用接口。
- 不修改 app.json。

任务 B-039：设备连接检查清单页 UI
只允许创建/修改：
- pages/device/checklist.wxml
- pages/device/checklist.wxss
- pages/device/checklist.js
- pages/device/checklist.json

要求：
- 展示检查项：硬件已插入电脑、手机蓝牙已开启、设备指示灯正常、医院电脑输入框已聚焦。
- 只做本地 checkbox UI 状态和按钮 disabled。
- “开始连接”按钮只 toast “等待接入设备检查服务”。
- 不调用蓝牙 API。
- 不调用接口。
- 不修改 app.json。

任务 B-040：文本导入入口页 UI
只允许创建/修改：
- pages/import/index.wxml
- pages/import/index.wxss
- pages/import/index.js
- pages/import/index.json

要求：
- 展示导入方式入口：手动输入、OCR 图片识别、录音转写、AI 整理、模板生成。
- 不写病历示例。
- 不写 AI prompt。
- 所有入口只保留函数入口并 toast “等待接入路由”。
- 不调用接口。
- 不修改 app.json。

任务 B-041：模板详情页 UI
只允许创建/修改：
- pages/templates/detail.wxml
- pages/templates/detail.wxss
- pages/templates/detail.js
- pages/templates/detail.json

要求：
- 展示模板标题、模板说明、字段填写区域、生成按钮。
- title/description/fields 由 onLoad(options) 传入，默认空字符串/空数组。
- 不写模板 prompt。
- 不写病历或报告样例。
- 只做本地字段输入状态和按钮 disabled。
- generateResult() 只 toast “等待接入模板服务”。
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
