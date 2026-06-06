# 低成本 AI 连续任务池 2 提示词

把下面这段完整发给另一个 AI。继续按“每 10 个任务交付一次，然后自动继续”的方式执行。

```text
继续参与病历传输小程序开发。你是低成本执行 AI，只负责低风险 UI 页面和静态交互。

先阅读：
- docs/DEVELOPMENT_STANDARDS.md
- docs/PARALLEL_AI_WORKFLOW.md
- docs/AI_TASK_SPLIT.md
- docs/CODE_REVIEW_CHECKLIST.md
- docs/PROJECT_COMMAND_CENTER.md
- docs/LOW_COST_AI_CONTINUOUS_TASK_POOL_PROMPT.md

硬规则：
- 不要写页面级 mock 数据。
- 不要用 setTimeout 假装接口成功。
- 不调用真实接口。
- 不读取或写入 storage。
- 不写 AI prompt。
- 不调用 DeepSeek/OCR/ASR。
- 不调用蓝牙 API。
- 不引用 utils/ble 或 utils/encoder。
- 不写真实联系方式、二维码、价格。
- 不写真实或仿真的病历正文、检查报告正文、患者信息。
- 不修改 app.json、services/**、utils/**、docs/**。
- 所有数据源、路由、服务逻辑全部由 Codex 接入。

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
- pages/device/**
- pages/history/**
- pages/settings/**
- pages/profile/**
- pages/help/**
- pages/common/**
- pages/ai/**
- pages/templates/**
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
- pages/admin/**
- pages/qa/**
- pages/ops/**
- pages/manual/**
- pages/sales/**
- pages/customer/**
- pages/demo/**
- utils/**
- services/**
- docs/**

例外：
- 下面任务明确点名的新文件可以创建。
- 除点名文件外，任何文件都不要碰。
- 不要修改 app.json，路由由 Codex 统一注册。

交付报告必须使用机器可读格式：

```text
TASK_RANGE: B-086~B-095
CREATED_FILES:
- path
UPDATED_FILES:
- path
NODE_CHECK:
- path: pass/fail
FORBIDDEN_FILES_MODIFIED: no
PAGE_LEVEL_MOCK: no
SETTIMEOUT_FAKE_SUCCESS: no
REAL_API_CALLED: no
BLE_API_CALLED: no
AI_OCR_ASR_CALLED: no
STORAGE_READ_WRITE: no
MEDICAL_SAMPLE_TEXT: no
ISSUES:
- none
PLACEHOLDERS:
- task id: placeholder summary
```

## 连续任务池 2

### B-086：销售线索列表页 UI
只允许创建/修改：
- pages/sales/leads.wxml
- pages/sales/leads.wxss
- pages/sales/leads.js
- pages/sales/leads.json

要求：
- 展示线索列表区域和空状态：“暂无线索”。
- leads 默认为空数组。
- 不写真实联系方式。
- 不调用接口。

### B-087：销售线索详情页 UI
只允许创建/修改：
- pages/sales/lead-detail.wxml
- pages/sales/lead-detail.wxss
- pages/sales/lead-detail.js
- pages/sales/lead-detail.json

要求：
- 展示客户名称占位、需求描述、跟进状态、备注区域。
- 所有字段由 onLoad(options) 传入，默认空字符串。
- 不写真实客户/医院名称。

### B-088：硬件发货记录页 UI
只允许创建/修改：
- pages/sales/shipping-records.wxml
- pages/sales/shipping-records.wxss
- pages/sales/shipping-records.js
- pages/sales/shipping-records.json

要求：
- 展示发货记录列表和空状态。
- records 默认为空数组。
- 不写真实快递单号。
- 不调用接口。

### B-089：激活码批量导入页 UI
只允许创建/修改：
- pages/admin/activation-import.wxml
- pages/admin/activation-import.wxss
- pages/admin/activation-import.js
- pages/admin/activation-import.json

要求：
- 展示批量输入区域、导入说明、提交按钮。
- 只做本地输入状态和按钮 disabled。
- 不写真实激活码。
- submitImport() 只 toast “等待接入激活码服务”。

### B-090：激活码列表页 UI
只允许创建/修改：
- pages/admin/activation-list.wxml
- pages/admin/activation-list.wxss
- pages/admin/activation-list.js
- pages/admin/activation-list.json

要求：
- 展示激活码列表区域、状态筛选、空状态。
- codes 默认为空数组。
- 不写真实激活码。
- 不调用接口。

### B-091：客户成功看板页 UI
只允许创建/修改：
- pages/customer/success-dashboard.wxml
- pages/customer/success-dashboard.wxss
- pages/customer/success-dashboard.js
- pages/customer/success-dashboard.json

要求：
- 展示待开通、待绑定、待培训、待回访四个统计卡。
- 所有统计默认 0。
- 不调用接口。

### B-092：客户培训记录页 UI
只允许创建/修改：
- pages/customer/training-records.wxml
- pages/customer/training-records.wxss
- pages/customer/training-records.js
- pages/customer/training-records.json

要求：
- 展示培训记录列表和空状态。
- records 默认为空数组。
- 不写真实医院/医生姓名。
- 不调用接口。

### B-093：客户回访记录页 UI
只允许创建/修改：
- pages/customer/follow-up-records.wxml
- pages/customer/follow-up-records.wxss
- pages/customer/follow-up-records.js
- pages/customer/follow-up-records.json

要求：
- 展示回访记录列表、状态筛选、空状态。
- records 默认为空数组。
- 不写真实联系方式。
- 不调用接口。

### B-094：演示模式入口页 UI
只允许创建/修改：
- pages/demo/index.wxml
- pages/demo/index.wxss
- pages/demo/index.js
- pages/demo/index.json

要求：
- 展示产品演示、设备演示、AI 演示、传输演示四个入口。
- 所有入口只 toast “等待接入演示服务”。
- 不写真实病历样例。
- 不调用蓝牙/AI。

### B-095：演示场景选择页 UI
只允许创建/修改：
- pages/demo/scenario-select.wxml
- pages/demo/scenario-select.wxss
- pages/demo/scenario-select.js
- pages/demo/scenario-select.json

要求：
- 展示门诊、住院、检查报告、随访记录四类场景。
- 只做本地选择状态。
- continueDemo() 只 toast “等待接入演示服务”。
- 不写场景正文样例。

### B-096：演示结果页 UI
只允许创建/修改：
- pages/demo/result.wxml
- pages/demo/result.wxss
- pages/demo/result.js
- pages/demo/result.json

要求：
- 展示演示结果区域、发送到电脑按钮、返回按钮。
- resultText 默认为空字符串。
- 不写演示病历正文。
- 所有按钮只 toast “等待接入演示服务”。

### B-097：用户消息中心页 UI
只允许创建/修改：
- pages/customer/messages.wxml
- pages/customer/messages.wxss
- pages/customer/messages.js
- pages/customer/messages.json

要求：
- 展示消息列表和空状态：“暂无消息”。
- messages 默认为空数组。
- 不写真实通知内容。
- 不调用接口。

### B-098：服务到期提醒页 UI
只允许创建/修改：
- pages/customer/expiry-reminder.wxml
- pages/customer/expiry-reminder.wxss
- pages/customer/expiry-reminder.js
- pages/customer/expiry-reminder.json

要求：
- 展示服务状态、到期时间、联系客服入口、续期说明。
- 不写价格。
- 不写真实联系方式。
- 按钮只 toast “等待接入客服服务”。

### B-099：设备异常提醒页 UI
只允许创建/修改：
- pages/customer/device-alert.wxml
- pages/customer/device-alert.wxss
- pages/customer/device-alert.js
- pages/customer/device-alert.json

要求：
- 展示异常类型、设备序列号、建议操作、提交工单按钮。
- 字段由 onLoad(options) 传入，默认空字符串。
- 不调用蓝牙 API。
- 不调用接口。

### B-100：传输异常提醒页 UI
只允许创建/修改：
- pages/customer/transfer-alert.wxml
- pages/customer/transfer-alert.wxss
- pages/customer/transfer-alert.js
- pages/customer/transfer-alert.json

要求：
- 展示异常说明、可能原因、建议操作、重新测试按钮。
- 不调用蓝牙 API。
- 不调用接口。

完成 B-086~B-095 后先交付一份报告，然后继续做 B-096~B-100。
```
