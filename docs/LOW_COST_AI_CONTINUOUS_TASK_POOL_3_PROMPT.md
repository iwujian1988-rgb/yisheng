# 低成本 AI 连续任务池 3 提示词

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
- docs/LOW_COST_AI_CONTINUOUS_TASK_POOL_2_PROMPT.md

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
- pages/backend/**
- pages/compliance/**
- pages/metrics/**
- utils/**
- services/**
- docs/**

例外：
- 下面任务明确点名的新文件可以创建。
- 除点名文件外，任何文件都不要碰。
- 不要修改 app.json，路由由 Codex 统一注册。

交付报告必须使用机器可读格式：

```text
TASK_RANGE: B-101~B-110
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

## 连续任务池 3

### B-101：后端连接状态页 UI
只允许创建/修改：
- pages/backend/status.wxml
- pages/backend/status.wxss
- pages/backend/status.js
- pages/backend/status.json

要求：
- 展示认证服务、付费用户服务、设备服务、AI 服务四个状态区域。
- 所有字段由 onLoad(options) 传入，默认空字符串。
- 不调用接口。

### B-102：接口健康检查页 UI
只允许创建/修改：
- pages/backend/health-check.wxml
- pages/backend/health-check.wxss
- pages/backend/health-check.js
- pages/backend/health-check.json

要求：
- 展示检查项列表和空状态。
- checks 默认为空数组。
- startCheck() 只 toast “等待接入后端检查服务”。
- 不调用接口。

### B-103：接口错误日志页 UI
只允许创建/修改：
- pages/backend/error-log.wxml
- pages/backend/error-log.wxss
- pages/backend/error-log.js
- pages/backend/error-log.json

要求：
- 展示错误日志列表和空状态：“暂无错误日志”。
- logs 默认为空数组。
- 不写真实 token、接口地址或错误日志。

### B-104：后端配置说明页 UI
只允许创建/修改：
- pages/backend/config-guide.wxml
- pages/backend/config-guide.wxss
- pages/backend/config-guide.js
- pages/backend/config-guide.json

要求：
- 展示 API Base URL、环境、鉴权方式三个说明区域。
- 不写真实 URL、token、密钥。
- 不调用接口。

### B-105：管理员权限角色页 UI
只允许创建/修改：
- pages/admin/role-list.wxml
- pages/admin/role-list.wxss
- pages/admin/role-list.js
- pages/admin/role-list.json

要求：
- 展示角色列表和空状态。
- roles 默认为空数组。
- 不写真实管理员账号。
- 不调用接口。

### B-106：管理员角色详情页 UI
只允许创建/修改：
- pages/admin/role-detail.wxml
- pages/admin/role-detail.wxss
- pages/admin/role-detail.js
- pages/admin/role-detail.json

要求：
- 展示角色名称、权限列表、备注区域。
- permissions 默认为空数组。
- 所有字段由 onLoad(options) 传入。
- 不调用接口。

### B-107：数据加密状态页 UI
只允许创建/修改：
- pages/compliance/encryption-status.wxml
- pages/compliance/encryption-status.wxss
- pages/compliance/encryption-status.js
- pages/compliance/encryption-status.json

要求：
- 展示本地数据、云端数据、AI 请求三个状态区域。
- 只展示说明，不写具体加密算法承诺。
- 不调用接口。

### B-108：脱敏规则说明页 UI
只允许创建/修改：
- pages/compliance/redaction-rules.wxml
- pages/compliance/redaction-rules.wxss
- pages/compliance/redaction-rules.js
- pages/compliance/redaction-rules.json

要求：
- 展示字段类型列表和处理说明。
- 不写真实患者信息。
- 不写 AI prompt。

### B-109：第三方 AI 数据边界页 UI
只允许创建/修改：
- pages/compliance/third-party-ai.wxml
- pages/compliance/third-party-ai.wxss
- pages/compliance/third-party-ai.js
- pages/compliance/third-party-ai.json

要求：
- 展示发送前脱敏、用户确认、结果审核三个区块。
- 不调用 AI。
- 不写绝对化法律承诺。

### B-110：合规确认清单页 UI
只允许创建/修改：
- pages/compliance/checklist.wxml
- pages/compliance/checklist.wxss
- pages/compliance/checklist.js
- pages/compliance/checklist.json

要求：
- 展示隐私政策、用户协议、脱敏说明、管理员不可见、数据清理五个检查项。
- 只做本地 checkbox UI 状态。
- 不读写 storage。

### B-111：长文本压测仪表盘 UI
只允许创建/修改：
- pages/metrics/long-text-dashboard.wxml
- pages/metrics/long-text-dashboard.wxss
- pages/metrics/long-text-dashboard.js
- pages/metrics/long-text-dashboard.json

要求：
- 展示目标 3000 字 / 120 秒、最近结果、通过率、记录列表。
- records 默认为空数组。
- 不写真实压测文本。
- 不调用蓝牙 API。

### B-112：传输性能指标页 UI
只允许创建/修改：
- pages/metrics/transfer-performance.wxml
- pages/metrics/transfer-performance.wxss
- pages/metrics/transfer-performance.js
- pages/metrics/transfer-performance.json

要求：
- 展示平均耗时、失败次数、取消次数、最长文本四个指标。
- 所有指标默认 0。
- 不调用蓝牙 API。

### B-113：设备稳定性指标页 UI
只允许创建/修改：
- pages/metrics/device-stability.wxml
- pages/metrics/device-stability.wxss
- pages/metrics/device-stability.js
- pages/metrics/device-stability.json

要求：
- 展示连接成功率、断开次数、写入失败次数、最近测试时间。
- 所有字段由 onLoad(options) 传入，默认空字符串或 0。
- 不调用蓝牙 API。

### B-114：AI 使用指标页 UI
只允许创建/修改：
- pages/metrics/ai-usage.wxml
- pages/metrics/ai-usage.wxss
- pages/metrics/ai-usage.js
- pages/metrics/ai-usage.json

要求：
- 展示调用次数、脱敏次数、审核通过次数、发送到电脑次数。
- 所有指标默认 0。
- 不调用 AI。

### B-115：OCR/ASR 使用指标页 UI
只允许创建/修改：
- pages/metrics/ocr-asr-usage.wxml
- pages/metrics/ocr-asr-usage.wxss
- pages/metrics/ocr-asr-usage.js
- pages/metrics/ocr-asr-usage.json

要求：
- 展示 OCR 次数、ASR 次数、确认使用次数、放弃次数。
- 所有指标默认 0。
- 不调用 OCR/ASR。

### B-116：新用户引导完成页 UI
只允许创建/修改：
- pages/customer/onboarding-done.wxml
- pages/customer/onboarding-done.wxss
- pages/customer/onboarding-done.js
- pages/customer/onboarding-done.json

要求：
- 展示完成提示、去绑定设备、去发送文本、查看教程三个入口。
- 所有入口只 toast “等待接入路由”。

### B-117：设备绑定成功页 UI
只允许创建/修改：
- pages/customer/device-bound-success.wxml
- pages/customer/device-bound-success.wxss
- pages/customer/device-bound-success.js
- pages/customer/device-bound-success.json

要求：
- 展示设备序列号、下一步入口、教程入口。
- serialNo 由 onLoad(options) 传入。
- 不调用接口。

### B-118：首次传输成功页 UI
只允许创建/修改：
- pages/customer/first-transfer-success.wxml
- pages/customer/first-transfer-success.wxss
- pages/customer/first-transfer-success.js
- pages/customer/first-transfer-success.json

要求：
- 展示成功提示、查看历史、继续发送、反馈体验入口。
- 所有入口只 toast “等待接入路由”。

### B-119：用户服务概览页 UI
只允许创建/修改：
- pages/customer/service-overview.wxml
- pages/customer/service-overview.wxss
- pages/customer/service-overview.js
- pages/customer/service-overview.json

要求：
- 展示服务状态、设备状态、最近传输、常用入口。
- 所有字段由 onLoad(options) 传入，默认空字符串。

### B-120：用户数据导出说明页 UI
只允许创建/修改：
- pages/customer/data-export-note.wxml
- pages/customer/data-export-note.wxss
- pages/customer/data-export-note.js
- pages/customer/data-export-note.json

要求：
- 展示可导出内容、不可导出内容、申请入口。
- 不写真实联系方式。
- 按钮只 toast “等待接入数据服务”。

完成 B-101~B-110 后先交付一份报告，然后继续 B-111~B-120。
```
