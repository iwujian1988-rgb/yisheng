# 低成本 AI 最终 UI 任务池提示词

把下面这段完整发给另一个 AI。这个任务池用于补齐剩余低风险 UI，不再等待逐轮派发。

```text
继续参与病历传输小程序开发。你是低成本执行 AI，只负责低风险 UI 页面和静态交互。

先阅读：
- docs/DEVELOPMENT_STANDARDS.md
- docs/PARALLEL_AI_WORKFLOW.md
- docs/AI_TASK_SPLIT.md
- docs/CODE_REVIEW_CHECKLIST.md
- docs/PROJECT_COMMAND_CENTER.md

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
- pages/finance/**
- pages/integration/**
- pages/release/**
- pages/analytics/**
- pages/maintenance/**
- pages/legal/**
- pages/training/**
- utils/**
- services/**
- docs/**

例外：
- 下面任务明确点名的新文件可以创建。
- 除点名文件外，任何文件都不要碰。
- 不要修改 app.json，路由由 Codex 统一注册。

交付报告必须使用机器可读格式：

```text
TASK_RANGE: B-121~B-140
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

每完成 20 个任务交付一次报告，然后继续下一组。

## Final UI Pool

### B-121：财务服务概览页 UI
只允许创建/修改：
- pages/finance/service-overview.wxml
- pages/finance/service-overview.wxss
- pages/finance/service-overview.js
- pages/finance/service-overview.json
要求：展示服务数量、有效服务、过期服务、待开通服务四个统计；全部默认 0；不写价格。

### B-122：发票信息页 UI
只允许创建/修改：
- pages/finance/invoice-info.wxml
- pages/finance/invoice-info.wxss
- pages/finance/invoice-info.js
- pages/finance/invoice-info.json
要求：展示发票抬头、税号、邮箱占位输入；只做本地表单状态；不调用接口。

### B-123：财务记录列表页 UI
只允许创建/修改：
- pages/finance/records.wxml
- pages/finance/records.wxss
- pages/finance/records.js
- pages/finance/records.json
要求：展示记录列表和空状态；records 默认空数组；不写价格；不调用接口。

### B-124：集成状态页 UI
只允许创建/修改：
- pages/integration/status.wxml
- pages/integration/status.wxss
- pages/integration/status.js
- pages/integration/status.json
要求：展示微信登录、后端 API、AI、OCR、ASR、蓝牙六个集成状态；字段由 options 传入；不调用接口。

### B-125：微信登录说明页 UI
只允许创建/修改：
- pages/integration/wechat-login-guide.wxml
- pages/integration/wechat-login-guide.wxss
- pages/integration/wechat-login-guide.js
- pages/integration/wechat-login-guide.json
要求：展示微信登录接入步骤和注意事项；不调用微信 API。

### B-126：AI Provider 配置说明页 UI
只允许创建/修改：
- pages/integration/ai-provider-guide.wxml
- pages/integration/ai-provider-guide.wxss
- pages/integration/ai-provider-guide.js
- pages/integration/ai-provider-guide.json
要求：展示模型、网关、脱敏、审核四个说明区；不写 API key；不写 prompt。

### B-127：OCR Provider 配置说明页 UI
只允许创建/修改：
- pages/integration/ocr-provider-guide.wxml
- pages/integration/ocr-provider-guide.wxss
- pages/integration/ocr-provider-guide.js
- pages/integration/ocr-provider-guide.json
要求：展示开源 OCR、上传、识别、确认四个说明区；不调用 OCR。

### B-128：ASR Provider 配置说明页 UI
只允许创建/修改：
- pages/integration/asr-provider-guide.wxml
- pages/integration/asr-provider-guide.wxss
- pages/integration/asr-provider-guide.js
- pages/integration/asr-provider-guide.json
要求：展示录音、转写、确认、发送四个说明区；不调用录音 API/ASR。

### B-129：发布版本列表页 UI
只允许创建/修改：
- pages/release/version-list.wxml
- pages/release/version-list.wxss
- pages/release/version-list.js
- pages/release/version-list.json
要求：展示版本列表和空状态；versions 默认空数组；不写真实发布日期。

### B-130：发布版本详情页 UI
只允许创建/修改：
- pages/release/version-detail.wxml
- pages/release/version-detail.wxss
- pages/release/version-detail.js
- pages/release/version-detail.json
要求：展示版本号、更新内容、风险项、回滚说明；字段由 options 传入。

### B-131：发布回滚确认页 UI
只允许创建/修改：
- pages/release/rollback-confirm.wxml
- pages/release/rollback-confirm.wxss
- pages/release/rollback-confirm.js
- pages/release/rollback-confirm.json
要求：展示版本号、风险提示、原因输入、确认按钮；只做本地状态。

### B-132：数据看板入口页 UI
只允许创建/修改：
- pages/analytics/index.wxml
- pages/analytics/index.wxss
- pages/analytics/index.js
- pages/analytics/index.json
要求：展示用户、设备、传输、AI、售后五个指标入口；入口 toast 占位。

### B-133：用户指标页 UI
只允许创建/修改：
- pages/analytics/users.wxml
- pages/analytics/users.wxss
- pages/analytics/users.js
- pages/analytics/users.json
要求：展示总用户、已开通、已绑定、活跃用户四个指标；默认 0。

### B-134：设备指标页 UI
只允许创建/修改：
- pages/analytics/devices.wxml
- pages/analytics/devices.wxss
- pages/analytics/devices.js
- pages/analytics/devices.json
要求：展示总设备、已绑定、异常、待交付四个指标；默认 0。

### B-135：传输指标页 UI
只允许创建/修改：
- pages/analytics/transfers.wxml
- pages/analytics/transfers.wxss
- pages/analytics/transfers.js
- pages/analytics/transfers.json
要求：展示传输次数、成功率、平均耗时、长文本通过率；默认 0。

### B-136：售后指标页 UI
只允许创建/修改：
- pages/analytics/support.wxml
- pages/analytics/support.wxss
- pages/analytics/support.js
- pages/analytics/support.json
要求：展示工单数、待处理、已关闭、平均处理时间；默认 0。

### B-137：系统维护入口页 UI
只允许创建/修改：
- pages/maintenance/index.wxml
- pages/maintenance/index.wxss
- pages/maintenance/index.js
- pages/maintenance/index.json
要求：展示清理缓存、重建索引、导出日志、检查配置四个入口；全部 toast 占位。

### B-138：系统维护日志页 UI
只允许创建/修改：
- pages/maintenance/logs.wxml
- pages/maintenance/logs.wxss
- pages/maintenance/logs.js
- pages/maintenance/logs.json
要求：展示日志列表和空状态；logs 默认空数组；不写真实日志。

### B-139：配置检查结果页 UI
只允许创建/修改：
- pages/maintenance/config-check.wxml
- pages/maintenance/config-check.wxss
- pages/maintenance/config-check.js
- pages/maintenance/config-check.json
要求：展示检查结果列表和空状态；results 默认空数组；不调用接口。

### B-140：数据清理确认页 UI
只允许创建/修改：
- pages/maintenance/cleanup-confirm.wxml
- pages/maintenance/cleanup-confirm.wxss
- pages/maintenance/cleanup-confirm.js
- pages/maintenance/cleanup-confirm.json
要求：展示清理类型、风险提示、确认按钮；只 toast “等待接入维护服务”。

### B-141：法律声明目录页 UI
只允许创建/修改：
- pages/legal/index.wxml
- pages/legal/index.wxss
- pages/legal/index.js
- pages/legal/index.json
要求：展示用户协议、隐私政策、免责声明、数据处理说明入口；入口 toast 占位。

### B-142：免责声明页 UI
只允许创建/修改：
- pages/legal/disclaimer.wxml
- pages/legal/disclaimer.wxss
- pages/legal/disclaimer.js
- pages/legal/disclaimer.json
要求：展示结构化占位文案；不写绝对化法律承诺；不涉及具体医疗建议。

### B-143：数据处理说明页 UI
只允许创建/修改：
- pages/legal/data-processing.wxml
- pages/legal/data-processing.wxss
- pages/legal/data-processing.js
- pages/legal/data-processing.json
要求：展示采集、存储、使用、删除四个区块；不写具体加密算法承诺。

### B-144：管理员培训目录页 UI
只允许创建/修改：
- pages/training/admin-index.wxml
- pages/training/admin-index.wxss
- pages/training/admin-index.js
- pages/training/admin-index.json
要求：展示付费用户创建、设备管理、服务记录、反馈处理四个培训入口；入口 toast 占位。

### B-145：医生培训目录页 UI
只允许创建/修改：
- pages/training/doctor-index.wxml
- pages/training/doctor-index.wxss
- pages/training/doctor-index.js
- pages/training/doctor-index.json
要求：展示首次使用、绑定设备、发送文本、AI 整理、问题处理五个入口。

### B-146：培训详情页 UI
只允许创建/修改：
- pages/training/detail.wxml
- pages/training/detail.wxss
- pages/training/detail.js
- pages/training/detail.json
要求：展示标题、步骤、注意事项；title/steps/notices 由 options 传入或默认空。

### B-147：培训完成页 UI
只允许创建/修改：
- pages/training/done.wxml
- pages/training/done.wxss
- pages/training/done.js
- pages/training/done.json
要求：展示完成提示、下一步入口、反馈入口；按钮 toast 占位。

### B-148：培训反馈页 UI
只允许创建/修改：
- pages/training/feedback.wxml
- pages/training/feedback.wxss
- pages/training/feedback.js
- pages/training/feedback.json
要求：展示评分选择、反馈输入、提交按钮；只做本地状态，不调用接口。

### B-149：最终验收总览页 UI
只允许创建/修改：
- pages/release/final-acceptance.wxml
- pages/release/final-acceptance.wxss
- pages/release/final-acceptance.js
- pages/release/final-acceptance.json
要求：展示前端、蓝牙、账号、设备、AI、合规、后端、压测八个验收项；只做 checkbox 状态。

### B-150：项目完成页 UI
只允许创建/修改：
- pages/release/project-done.wxml
- pages/release/project-done.wxss
- pages/release/project-done.js
- pages/release/project-done.json
要求：展示完成提示、待上线事项、下一步入口；按钮 toast 占位。

完成 B-121~B-140 后先交付报告，然后继续 B-141~B-150。
```
