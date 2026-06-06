# 小程序开发任务路线图

## A 线：Codex 核心任务

### A-001 架构规范和协作制度

状态：已开始

产出：

- `docs/TECH_LEAD_HANDOFF.md`
- `docs/AI_TASK_SPLIT.md`
- `docs/CODE_REVIEW_CHECKLIST.md`
- `docs/DEVELOPMENT_STANDARDS.md`
- `docs/PARALLEL_AI_WORKFLOW.md`

### A-002 蓝牙核心保护性封装

状态：第一步已完成

目标：

- 不改变现有行为。
- 从 `pages/home/home.js` 提炼 BLE、encoder、send queue 的边界。
- 保留当前可运行页面。
- 后续允许单独测试编码和时间估算。

允许修改：

- `pages/home/home.js`
- `utils/ble/**`
- `utils/encoder/**`
- `utils/constants/**`

验收：

- 原首页行为不变。
- VUC 预览结果不变或差异有说明。
- 发送逻辑保留取消、进度、分片、动态延迟。

当前已完成：

- 新增 `utils/encoder/vuc.js`。
- 新增 `utils/ble/protocol.js`。
- 新增 `utils/ble/send-profile.js`。
- 首页引用工具模块，保留原发送顺序和延迟策略。
- 已通过 JS 语法检查和 VUC/packet 行为抽查。

### A-003 账号和付费用户架构

状态：骨架已完成

目标：

- 定义登录、注册、微信登录后的购买状态判断。
- 定义后台创建付费用户的数据结构。
- 定义设备绑定状态。

产出：

- API 草案。
- 状态机。
- 页面跳转策略。

当前已完成：

- 新增 `services/constants/account-status.js`，定义账号、购买、设备绑定、服务状态。
- 新增 `services/auth/session.js`，提供登录后 session 归一化和本地持久化入口。
- 新增 `services/api/client.js`，提供统一 API 请求骨架。
- 新增 `services/device/binding.js`，提供设备绑定服务入口。
- 新增 `services/payment/entitlement.js`，提供购买权益查询服务入口。
- 新增 `docs/AUTH_PAYMENT_DEVICE_ARCHITECTURE.md`，记录状态机、登录返回结构和跳转策略。
- 新增 `services/dev/test-data.js` 和 `services/auth/dev-auth.js`，提供可直接测试的开发测试数据。
- 注册、找回密码、账号状态页已从页面 mock 改为调用服务层测试数据。

### A-004 医疗文本加密和脱敏设计

状态：脱敏核心骨架已完成

目标：

- 明确用户可看、管理员不可看。
- 明确 AI 前脱敏。
- 明确日志和埋点边界。

产出：

- 数据模型。
- 脱敏字段规则。
- AI 调用流程。

当前已完成：

- 新增 `services/security/redaction.js`。
- 新增 `services/security/content-guard.js`。
- 新增 `docs/SECURITY_AI_DATA_BOUNDARY.md`。

### A-005 AI 内容生成核心

状态：核心服务骨架已完成

目标：

- DeepSeek V4 接入方案。
- 病历整理、报告整理、术语校对、内容润色 prompt 体系。
- AI 输出进入发送链路前确认。

当前已完成：

- 新增 `services/ai/prompts.js`。
- 新增 `services/ai/provider.js`。
- 新增 `services/ai/assistant.js`。
- 新增 `docs/AI_CORE_ARCHITECTURE.md`。
- AI 输入已通过 `services/security/content-guard.js` 脱敏。
- AI 对话详情页已接入 `services/ai/assistant.js` 的开发测试 provider。

## B 线：低成本 AI 页面任务

### B-001 注册页 UI

允许修改：

- `pages/register/register.wxml`
- `pages/register/register.wxss`
- `pages/register/register.js`
- `pages/register/register.json`

禁止：

- 修改 `app.json`。
- 调用真实接口。
- 实现购买状态判断。

### B-002 找回密码页 UI

允许修改：

- `pages/forgot-password/forgot-password.wxml`
- `pages/forgot-password/forgot-password.wxss`
- `pages/forgot-password/forgot-password.js`
- `pages/forgot-password/forgot-password.json`

### B-003 购买状态提示页 UI

用于未购买、已购买未绑定、服务过期、设备冲突等状态提示。

允许修改：

- `pages/account-status/account-status.wxml`
- `pages/account-status/account-status.wxss`
- `pages/account-status/account-status.js`
- `pages/account-status/account-status.json`

### B-004 设备管理页 UI

状态：AI-B 已完成 UI，Codex 已接入测试 session 设备信息和路由。

允许修改：

- `pages/device/device.wxml`
- `pages/device/device.wxss`
- `pages/device/device.js`
- `pages/device/device.json`

### B-005 历史记录页 UI

状态：AI-B 已完成 UI，Codex 已接入本地测试记录服务和路由。默认记录为空数组。

允许修改：

- `pages/history/history.wxml`
- `pages/history/history.wxss`
- `pages/history/history.js`
- `pages/history/history.json`

要求：

- 不写真实病历 mock。
- 页面默认使用空数组；如任务卡要求测试数据，只能使用 Codex 提供的测试数据。

### B-006 传输设置页 UI

状态：AI-B 已完成 UI，Codex 已接入本地设置持久化和路由。真实发送参数映射待接入。

允许修改：

- `pages/settings/transfer.wxml`
- `pages/settings/transfer.wxss`
- `pages/settings/transfer.js`
- `pages/settings/transfer.json`

要求：

- 只做 UI，不改变实际发送速度。

### B-007 个人中心和客服页 UI

状态：AI-B 已完成 UI，Codex 已接入 session 和主要路由。

允许修改：

- `pages/profile/**`
- `pages/help/**`

### B-008 帮助中心页 UI

状态：AI-B 已完成 UI，Codex 已注册路由。

允许修改：

- `pages/help/help.wxml`
- `pages/help/help.wxss`
- `pages/help/help.js`
- `pages/help/help.json`

### B-009 协议与隐私政策页 UI

状态：AI-B 已完成 UI，Codex 已修正数据边界文案并注册路由。

允许修改：

- `pages/common/agreement.wxml`
- `pages/common/agreement.wxss`
- `pages/common/agreement.js`
- `pages/common/agreement.json`

### B-010 AI 对话列表页 UI

状态：AI-B 已完成 UI，Codex 已注册路由。真实 AI 交互待接入。

允许修改：

- `pages/ai/index.wxml`
- `pages/ai/index.wxss`
- `pages/ai/index.js`
- `pages/ai/index.json`

### B-011 模板库页 UI

状态：AI-B 已完成 UI，Codex 已注册路由。模板数据源待接入。

允许修改：

- `pages/templates/index.wxml`
- `pages/templates/index.wxss`
- `pages/templates/index.js`
- `pages/templates/index.json`

### B-012 OCR 上传页 UI

状态：AI-B 已完成 UI，Codex 已注册路由。OCR 服务骨架已新增，真实识别待接入。

允许修改：

- `pages/ocr/index.wxml`
- `pages/ocr/index.wxss`
- `pages/ocr/index.js`
- `pages/ocr/index.json`

### B-013 录音转写页 UI

状态：AI-B 已完成 UI，Codex 已注册路由。ASR 服务骨架已新增，真实转写待接入。

允许修改：

- `pages/asr/index.wxml`
- `pages/asr/index.wxss`
- `pages/asr/index.js`
- `pages/asr/index.json`

### B-014 AI 对话详情页 UI

状态：AI-B 已完成 UI，Codex 已注册路由，并接入 `services/ai/assistant.js` 开发测试 provider。

允许修改：

- `pages/ai/detail.wxml`
- `pages/ai/detail.wxss`
- `pages/ai/detail.js`
- `pages/ai/detail.json`

### B-015 模板应用结果页 UI

状态：AI-B 已完成 UI，Codex 已注册路由并接入待发送草稿服务。

允许修改：

- `pages/templates/result.wxml`
- `pages/templates/result.wxss`
- `pages/templates/result.js`
- `pages/templates/result.json`

### B-016 OCR 结果确认页 UI

状态：AI-B 已完成 UI，Codex 已注册路由并接入待发送草稿服务。

允许修改：

- `pages/ocr/result.wxml`
- `pages/ocr/result.wxss`
- `pages/ocr/result.js`
- `pages/ocr/result.json`

### B-017 ASR 结果确认页 UI

状态：AI-B 已完成 UI，Codex 已注册路由并接入待发送草稿服务。

允许修改：

- `pages/asr/result.wxml`
- `pages/asr/result.wxss`
- `pages/asr/result.js`
- `pages/asr/result.json`

### B-018 购买/开通提示页 UI

状态：AI-B 已完成 UI，Codex 已注册路由并接入测试激活码服务。

允许修改：

- `pages/purchase/index.wxml`
- `pages/purchase/index.wxss`
- `pages/purchase/index.js`
- `pages/purchase/index.json`

### B-019 设备绑定表单页 UI

状态：AI-B 已完成 UI，Codex 已注册路由并接入测试设备绑定服务。

允许修改：

- `pages/device/bind.wxml`
- `pages/device/bind.wxss`
- `pages/device/bind.js`
- `pages/device/bind.json`

### B-020 售后支持页 UI

状态：AI-B 已完成 UI，Codex 已注册路由。设备故障入口已指向待开发故障提交页。

允许修改：

- `pages/support/index.wxml`
- `pages/support/index.wxss`
- `pages/support/index.js`
- `pages/support/index.json`

### B-021 操作教程列表页 UI

状态：AI-B 已完成 UI，Codex 已注册路由并接入空教程服务。

允许修改：

- `pages/tutorials/index.wxml`
- `pages/tutorials/index.wxss`
- `pages/tutorials/index.js`
- `pages/tutorials/index.json`

### B-022 意见反馈页 UI

状态：AI-B 已完成 UI，Codex 已注册路由并接入本地测试提交服务。

允许修改：

- `pages/feedback/index.wxml`
- `pages/feedback/index.wxss`
- `pages/feedback/index.js`
- `pages/feedback/index.json`

### B-023 关于我们页 UI

状态：AI-B 已完成 UI，Codex 已注册路由并接入协议/帮助入口。

允许修改：

- `pages/about/index.wxml`
- `pages/about/index.wxss`
- `pages/about/index.js`
- `pages/about/index.json`

### B-024 教程详情页 UI

状态：AI-B 已完成 UI，Codex 已注册路由并接入空教程详情服务。

允许修改：

- `pages/tutorials/detail.wxml`
- `pages/tutorials/detail.wxss`
- `pages/tutorials/detail.js`
- `pages/tutorials/detail.json`

### B-025 设备故障提交页 UI

状态：AI-B 已完成 UI，Codex 已注册路由并接入本地测试提交服务。

允许修改：

- `pages/support/device-issue.wxml`
- `pages/support/device-issue.wxss`
- `pages/support/device-issue.js`
- `pages/support/device-issue.json`

### B-026 网络测试页 UI

状态：AI-B 已完成 UI，Codex 已注册路由并接入诊断服务骨架。

允许修改：

- `pages/network-test/index.wxml`
- `pages/network-test/index.wxss`
- `pages/network-test/index.js`
- `pages/network-test/index.json`

### B-027 连接教程页 UI

状态：AI-B 已完成 UI，Codex 已注册路由并接入教程服务骨架。

允许修改：

- `pages/tutorials/connect-guide.wxml`
- `pages/tutorials/connect-guide.wxss`
- `pages/tutorials/connect-guide.js`
- `pages/tutorials/connect-guide.json`

### B-028 传输完成页 UI

状态：AI-B 已完成 UI，Codex 已注册路由并接入首页/历史入口。

允许修改：

- `pages/transfer/result.wxml`
- `pages/transfer/result.wxss`
- `pages/transfer/result.js`
- `pages/transfer/result.json`

### B-029 通用错误页 UI

状态：AI-B 已完成 UI，Codex 已注册路由并接入返回首页操作。

允许修改：

- `pages/error/index.wxml`
- `pages/error/index.wxss`
- `pages/error/index.js`
- `pages/error/index.json`

### B-030 激活码开通页 UI

状态：AI-B 已完成 UI，Codex 已注册路由并接入测试激活服务。

允许修改：

- `pages/purchase/activate.wxml`
- `pages/purchase/activate.wxss`
- `pages/purchase/activate.js`
- `pages/purchase/activate.json`

### B-031 购买/服务记录页 UI

状态：AI-B 已完成 UI，Codex 已注册路由并接入本地测试服务记录。

允许修改：

- `pages/purchase/records.wxml`
- `pages/purchase/records.wxss`
- `pages/purchase/records.js`
- `pages/purchase/records.json`

### B-032 设备详情页 UI

状态：AI-B 已完成 UI，Codex 已注册路由并接入 session 设备信息和解绑服务。

允许修改：

- `pages/device/detail.wxml`
- `pages/device/detail.wxss`
- `pages/device/detail.js`
- `pages/device/detail.json`

### B-033 个人资料页 UI

状态：AI-B 已完成 UI，Codex 已注册路由并接入本地测试资料保存服务。

允许修改：

- `pages/profile/edit.wxml`
- `pages/profile/edit.wxss`
- `pages/profile/edit.js`
- `pages/profile/edit.json`

### B-034 隐私设置页 UI

允许修改：

- `pages/settings/privacy.wxml`
- `pages/settings/privacy.wxss`
- `pages/settings/privacy.js`
- `pages/settings/privacy.json`

### B-035 通知设置页 UI

允许修改：

- `pages/settings/notifications.wxml`
- `pages/settings/notifications.wxss`
- `pages/settings/notifications.js`
- `pages/settings/notifications.json`

### B-036 本地数据管理页 UI

允许修改：

- `pages/settings/storage.wxml`
- `pages/settings/storage.wxss`
- `pages/settings/storage.js`
- `pages/settings/storage.json`

### B-037 开发调试入口页 UI

允许修改：

- `pages/dev/index.wxml`
- `pages/dev/index.wxss`
- `pages/dev/index.js`
- `pages/dev/index.json`

## 当前推荐开工顺序

1. Codex 完成 A-002，保护性封装蓝牙核心。
2. AI-B 同时做 B-001、B-002、B-003，但不得改 `app.json`。
3. Codex 完成 A-003，把账号/付费用户状态机接入路由。
4. AI-B 做 B-004、B-005、B-006。
5. Codex 做 A-004、A-005。
