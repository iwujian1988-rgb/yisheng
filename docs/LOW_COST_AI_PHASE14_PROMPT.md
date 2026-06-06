# 低成本 AI Phase 14 提示词

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
- docs/PHASE10_REVIEW_PHASE11_STATUS.md
- docs/PHASE11_REVIEW_PHASE12_STATUS.md

重要规则：
- 不要写页面级 mock 数据。
- 不要用 setTimeout 假装接口成功。
- 不调用真实接口。
- 不写 AI prompt。
- 不调用 DeepSeek/OCR/ASR。
- 不调用蓝牙 API。
- 不引用 utils/ble 或 utils/encoder。
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

除非任务卡明确允许，否则不要修改任何未点名文件。

你下一批只做低风险 UI 页面，本轮一次完成 B-056 到 B-065：

任务 B-056：管理员工作台入口页 UI
只允许创建/修改：
- pages/admin/index.wxml
- pages/admin/index.wxss
- pages/admin/index.js
- pages/admin/index.json

要求：
- 展示付费用户管理、设备管理、服务记录、问题反馈四个入口。
- 不写真实管理员账号。
- 所有入口只 toast “等待接入后台路由”。
- 不调用接口。
- 不修改 app.json。

任务 B-057：付费用户创建页 UI
只允许创建/修改：
- pages/admin/paid-user-create.wxml
- pages/admin/paid-user-create.wxss
- pages/admin/paid-user-create.js
- pages/admin/paid-user-create.json

要求：
- 展示手机号、服务期限、设备序列号、备注输入区。
- 只做本地输入状态和按钮 disabled。
- 不写价格。
- submitCreate() 只 toast “等待接入付费用户服务”。
- 不调用接口。
- 不修改 app.json。

任务 B-058：付费用户列表页 UI
只允许创建/修改：
- pages/admin/paid-user-list.wxml
- pages/admin/paid-user-list.wxss
- pages/admin/paid-user-list.js
- pages/admin/paid-user-list.json

要求：
- 展示搜索框、列表区域、空状态：“暂无用户”。
- users 默认为空数组。
- 不写用户 mock 数据。
- 不调用接口。
- 不修改 app.json。

任务 B-059：管理员设备列表页 UI
只允许创建/修改：
- pages/admin/device-list.wxml
- pages/admin/device-list.wxss
- pages/admin/device-list.js
- pages/admin/device-list.json

要求：
- 展示搜索框、设备列表区域、空状态：“暂无设备”。
- devices 默认为空数组。
- 不写设备 mock 数据。
- 不调用接口。
- 不修改 app.json。

任务 B-060：管理员服务记录页 UI
只允许创建/修改：
- pages/admin/service-records.wxml
- pages/admin/service-records.wxss
- pages/admin/service-records.js
- pages/admin/service-records.json

要求：
- 展示服务记录列表区域、筛选状态、空状态：“暂无服务记录”。
- records 默认为空数组。
- 不写订单 mock 数据。
- 不写价格。
- 不调用接口。
- 不修改 app.json。

任务 B-061：管理员反馈处理页 UI
只允许创建/修改：
- pages/admin/feedback-review.wxml
- pages/admin/feedback-review.wxss
- pages/admin/feedback-review.js
- pages/admin/feedback-review.json

要求：
- 展示反馈列表区域、状态筛选、空状态：“暂无反馈”。
- feedbacks 默认为空数组。
- 不写真实反馈内容。
- 不调用接口。
- 不修改 app.json。

任务 B-062：小程序冒烟测试清单页 UI
只允许创建/修改：
- pages/qa/smoke-checklist.wxml
- pages/qa/smoke-checklist.wxss
- pages/qa/smoke-checklist.js
- pages/qa/smoke-checklist.json

要求：
- 展示登录、设备绑定、文本导入、传输、历史记录、设置六个测试项。
- 只做本地 checkbox UI 状态。
- 不调用真实流程。
- 不调用接口。
- 不修改 app.json。

任务 B-063：长文本压测记录页 UI
只允许创建/修改：
- pages/qa/long-text-test.wxml
- pages/qa/long-text-test.wxss
- pages/qa/long-text-test.js
- pages/qa/long-text-test.json

要求：
- 展示目标：3000 字 2 分钟内完成。
- 展示记录列表区域和空状态。
- records 默认为空数组。
- 不写真实病历或压测文本。
- startTest() 只 toast “等待接入压测服务”。
- 不调用蓝牙 API。
- 不修改 app.json。

任务 B-064：版本发布检查页 UI
只允许创建/修改：
- pages/qa/release-check.wxml
- pages/qa/release-check.wxss
- pages/qa/release-check.js
- pages/qa/release-check.json

要求：
- 展示发布前检查项：隐私说明、登录开通、设备绑定、蓝牙发送、AI 脱敏、错误处理。
- 只做本地 checkbox UI 状态。
- 不调用真实流程。
- 不调用接口。
- 不修改 app.json。

任务 B-065：测试账号说明页 UI
只允许创建/修改：
- pages/qa/test-accounts.wxml
- pages/qa/test-accounts.wxss
- pages/qa/test-accounts.js
- pages/qa/test-accounts.json

要求：
- 展示测试账号说明区域，但不要写具体账号和密码。
- 展示“查看测试账号”按钮，按钮只 toast “等待接入开发工具服务”。
- 不读取 storage。
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

额外自检：
- 所有 JS 必须通过 `node --check`。
- 不要修改 app.json，路由由 Codex 统一接入。
- 不要修改 docs，这份任务卡之外的文档由 Codex 维护。
- 如果发现必须修改禁止文件，停止并说明原因，不要自行修改。
```
