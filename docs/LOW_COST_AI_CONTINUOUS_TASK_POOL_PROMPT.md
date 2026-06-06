# 低成本 AI 连续任务池提示词

把下面这段完整发给另一个 AI。这个提示词用于长期连续执行，不再每 4 个页面等一次新任务。

```text
继续参与病历传输小程序开发。你是低成本执行 AI，只负责低风险 UI 页面和静态交互。

项目背景：
- 这是一个“微信小程序 + 专属硬件”的医疗文本传输产品。
- 用户主要是医生。小程序把文字、OCR、ASR、AI 整理后的文本，通过蓝牙发给插在医院电脑 USB 口上的硬件。
- 硬件模拟键盘，把内容输入到医院内网系统。
- 首页蓝牙/VUC/发送链路是已调通过的核心资产，严禁你修改。
- 账号、付费用户、设备绑定、AI/OCR/ASR、加密、脱敏、后端接口全部由 Codex 接入。

开工前必须先阅读：
- docs/DEVELOPMENT_STANDARDS.md
- docs/PARALLEL_AI_WORKFLOW.md
- docs/TASK_ROADMAP.md
- docs/AI_TASK_SPLIT.md
- docs/CODE_REVIEW_CHECKLIST.md
- docs/REVIEW_LOG.md
- docs/SECURITY_AI_DATA_BOUNDARY.md
- docs/PHASE10_REVIEW_PHASE11_STATUS.md
- docs/PHASE11_REVIEW_PHASE12_STATUS.md
- docs/PHASE12_13_REVIEW_PHASE14_STATUS.md

重要规则：
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
- 所有数据源、路由、服务逻辑全部由 Codex 接入。
- 你只创建任务卡允许的新页面文件；不要修改已有页面。

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
- utils/**
- services/**
- docs/**

例外：
- 下面任务明确点名的新文件可以创建。
- 除点名文件外，任何文件都不要碰。
- 不要修改 app.json，路由由 Codex 统一注册。

工作方式：
- 从 B-066 开始按顺序做。
- 每完成 10 个任务交付一次报告，然后继续做后面的 10 个任务，不需要等新提示词。
- 如果某个任务需要修改禁止文件，跳过该任务并在报告中说明。
- 如果你发现目标文件已存在，不要覆盖，先检查是否符合任务要求；只在必要时修改该任务允许文件。

交付报告必须使用这个机器可读格式，不要写长篇解释：

```text
TASK_RANGE: B-066~B-075
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

## 连续任务池

### B-066：管理员付费用户详情页 UI
只允许创建/修改：
- pages/admin/paid-user-detail.wxml
- pages/admin/paid-user-detail.wxss
- pages/admin/paid-user-detail.js
- pages/admin/paid-user-detail.json

要求：
- 展示手机号、服务状态、到期时间、绑定设备、操作区。
- 所有字段由 onLoad(options) 传入，默认空字符串。
- 不写用户 mock 数据。
- 不写价格。
- 操作按钮只 toast “等待接入后台服务”。

### B-067：管理员付费用户编辑页 UI
只允许创建/修改：
- pages/admin/paid-user-edit.wxml
- pages/admin/paid-user-edit.wxss
- pages/admin/paid-user-edit.js
- pages/admin/paid-user-edit.json

要求：
- 展示服务期限、服务状态、备注输入区。
- 只做本地输入状态和按钮 disabled。
- saveUser() 只 toast “等待接入后台服务”。
- 不调用接口。

### B-068：管理员设备详情页 UI
只允许创建/修改：
- pages/admin/device-detail.wxml
- pages/admin/device-detail.wxss
- pages/admin/device-detail.js
- pages/admin/device-detail.json

要求：
- 展示设备序列号、型号、固件版本、绑定用户、绑定状态。
- 所有字段由 onLoad(options) 传入，默认空字符串。
- 不写设备 mock 数据。
- 操作按钮只 toast “等待接入设备服务”。

### B-069：管理员服务记录详情页 UI
只允许创建/修改：
- pages/admin/service-record-detail.wxml
- pages/admin/service-record-detail.wxss
- pages/admin/service-record-detail.js
- pages/admin/service-record-detail.json

要求：
- 展示用户、开通时间、到期时间、服务状态、备注。
- 所有字段由 onLoad(options) 传入。
- 不写订单 mock 数据。
- 不写价格。

### B-070：管理员反馈详情页 UI
只允许创建/修改：
- pages/admin/feedback-detail.wxml
- pages/admin/feedback-detail.wxss
- pages/admin/feedback-detail.js
- pages/admin/feedback-detail.json

要求：
- 展示反馈类型、提交时间、处理状态、内容区域、处理备注输入区。
- content 默认为空字符串。
- 不写真实反馈内容。
- submitReview() 只 toast “等待接入反馈服务”。

### B-071：管理员操作日志页 UI
只允许创建/修改：
- pages/admin/audit-log.wxml
- pages/admin/audit-log.wxss
- pages/admin/audit-log.js
- pages/admin/audit-log.json

要求：
- 展示操作日志列表区域和空状态：“暂无操作日志”。
- logs 默认为空数组。
- 不写管理员 mock 数据。
- 不调用接口。

### B-072：管理员系统设置页 UI
只允许创建/修改：
- pages/admin/settings.wxml
- pages/admin/settings.wxss
- pages/admin/settings.js
- pages/admin/settings.json

要求：
- 展示开通规则、设备规则、测试模式三个设置入口。
- 只做 UI 入口。
- 所有入口只 toast “等待接入后台设置服务”。

### B-073：冒烟测试结果页 UI
只允许创建/修改：
- pages/qa/smoke-result.wxml
- pages/qa/smoke-result.wxss
- pages/qa/smoke-result.js
- pages/qa/smoke-result.json

要求：
- 展示测试结果汇总、通过数、失败数、问题列表区域。
- issues 默认为空数组。
- 不调用真实测试流程。

### B-074：Bug 提交页 UI
只允许创建/修改：
- pages/qa/bug-report.wxml
- pages/qa/bug-report.wxss
- pages/qa/bug-report.js
- pages/qa/bug-report.json

要求：
- 展示问题类型、复现步骤输入框、期望结果输入框、实际结果输入框。
- 只做本地输入状态和按钮 disabled。
- submitBug() 只 toast “等待接入测试服务”。
- 不写真实病历或患者信息。

### B-075：硬件测试指引页 UI
只允许创建/修改：
- pages/qa/hardware-test-guide.wxml
- pages/qa/hardware-test-guide.wxss
- pages/qa/hardware-test-guide.js
- pages/qa/hardware-test-guide.json

要求：
- 展示设备插入、蓝牙连接、文本发送、电脑输入框确认四个步骤。
- 只写通用测试步骤。
- 不调用蓝牙 API。

### B-076：蓝牙测试报告页 UI
只允许创建/修改：
- pages/qa/bluetooth-test-report.wxml
- pages/qa/bluetooth-test-report.wxss
- pages/qa/bluetooth-test-report.js
- pages/qa/bluetooth-test-report.json

要求：
- 展示适配器状态、连接状态、写入状态、传输结果四个区域。
- 所有字段由 onLoad(options) 传入，默认空字符串。
- 不调用蓝牙 API。
- 不写真实设备日志。

### B-077：隐私合规检查页 UI
只允许创建/修改：
- pages/qa/privacy-check.wxml
- pages/qa/privacy-check.wxss
- pages/qa/privacy-check.js
- pages/qa/privacy-check.json

要求：
- 展示协议展示、脱敏说明、管理员不可见说明、本地数据清理四个检查项。
- 只做本地 checkbox UI 状态。
- 不写绝对化法律承诺。

### B-078：现场部署检查页 UI
只允许创建/修改：
- pages/ops/field-checklist.wxml
- pages/ops/field-checklist.wxss
- pages/ops/field-checklist.js
- pages/ops/field-checklist.json

要求：
- 展示硬件、账号、医院电脑、网络、售后信息五个检查项。
- 只做本地 checkbox UI 状态。
- 不写医院真实名称。
- 不写真实联系方式。

### B-079：医院电脑环境说明页 UI
只允许创建/修改：
- pages/ops/hospital-env-note.wxml
- pages/ops/hospital-env-note.wxss
- pages/ops/hospital-env-note.js
- pages/ops/hospital-env-note.json

要求：
- 展示普通电脑、远程桌面、虚拟机、浏览器系统、未知环境说明。
- 只写通用说明。
- 不写医院真实名称。

### B-080：设备交付记录页 UI
只允许创建/修改：
- pages/ops/device-handover.wxml
- pages/ops/device-handover.wxss
- pages/ops/device-handover.js
- pages/ops/device-handover.json

要求：
- 展示设备序列号、交付对象、交付日期、备注输入区。
- 只做本地输入状态和按钮 disabled。
- submitHandover() 只 toast “等待接入交付服务”。
- 不调用接口。

### B-081：售后工单列表页 UI
只允许创建/修改：
- pages/ops/ticket-list.wxml
- pages/ops/ticket-list.wxss
- pages/ops/ticket-list.js
- pages/ops/ticket-list.json

要求：
- 展示工单列表区域和空状态：“暂无工单”。
- tickets 默认为空数组。
- 不写真实联系方式。
- 不调用接口。

### B-082：售后工单详情页 UI
只允许创建/修改：
- pages/ops/ticket-detail.wxml
- pages/ops/ticket-detail.wxss
- pages/ops/ticket-detail.js
- pages/ops/ticket-detail.json

要求：
- 展示工单类型、状态、描述、处理记录区域。
- records 默认为空数组。
- 不写真实工单内容。
- 操作按钮只 toast “等待接入售后服务”。

### B-083：用户操作手册目录页 UI
只允许创建/修改：
- pages/manual/index.wxml
- pages/manual/index.wxss
- pages/manual/index.js
- pages/manual/index.json

要求：
- 展示目录：首次使用、绑定设备、发送文本、AI 整理、问题排查。
- 所有入口只 toast “等待接入手册路由”。
- 不调用接口。

### B-084：用户操作手册详情页 UI
只允许创建/修改：
- pages/manual/detail.wxml
- pages/manual/detail.wxss
- pages/manual/detail.js
- pages/manual/detail.json

要求：
- 展示标题、步骤列表、注意事项区域。
- title 默认为空字符串，steps/notices 默认为空数组。
- 不写教程 mock 数据。
- 不写视频链接。

### B-085：发布说明页 UI
只允许创建/修改：
- pages/common/release-note.wxml
- pages/common/release-note.wxss
- pages/common/release-note.js
- pages/common/release-note.json

要求：
- 展示版本号、更新内容列表、注意事项区域。
- version 由 onLoad(options) 传入，默认空字符串。
- updates/notices 默认为空数组。
- 不写真实发布日期。

完成 B-066~B-075 后先交付一份报告，然后继续做 B-076~B-085。
```
