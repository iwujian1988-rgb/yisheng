# 低成本 AI 剩余 UI 总任务池提示词

把下面这段完整发给低成本 AI。本任务池用于一次性补齐剩余低风险 UI，不再逐轮等待 Codex 派发。

```text
继续参与病历传输小程序开发。你是低成本执行 AI，只负责低风险 UI 页面和静态交互。

先阅读：
- docs/DEVELOPMENT_STANDARDS.md
- docs/PARALLEL_AI_WORKFLOW.md
- docs/AI_TASK_SPLIT.md
- docs/CODE_REVIEW_CHECKLIST.md
- docs/PROJECT_COMMAND_CENTER.md
- docs/LOW_COST_AI_CONTINUOUS_TASK_POOL_2_PROMPT.md
- docs/LOW_COST_AI_FINAL_UI_TASK_POOL_PROMPT.md

硬规则：
- 不要写页面级 mock 数据，不要用 setTimeout 假装接口成功。
- 不调用真实接口，不读取或写入 storage。
- 不写 AI prompt，不调用 DeepSeek/OCR/ASR。
- 不调用蓝牙 API，不引用 utils/ble 或 utils/encoder。
- 不写真实联系方式、二维码、价格、真实客户/医院/医生/患者信息。
- 不写真实或仿真的病历正文、检查报告正文、演示病历正文。
- 不修改 app.json、app.js、app.wxss、project.config.json。
- 不修改 services/**、utils/**、docs/**。
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
- pages/ops/**
- pages/manual/**
- pages/backend/**
- pages/compliance/**
- pages/metrics/**
- pages/customer/**
- utils/**
- services/**
- docs/**

例外：
- 下面任务明确点名的新文件可以创建。
- 如果目标文件已存在，不要覆盖；先检查是否符合要求，只在必要时修改该任务允许文件。
- 不要修改 app.json，路由由 Codex 统一注册。

交付报告必须用机器可读格式。每完成 15 个任务交付一次，然后继续下一组：

TASK_RANGE: B-086~B-100
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

任务要求：

B-086 销售线索列表页
只允许创建/修改 pages/sales/leads.{wxml,wxss,js,json}
展示线索列表区域和空状态“暂无线索”；leads 默认空数组；不写真实联系方式；不调用接口。

B-087 销售线索详情页
只允许创建/修改 pages/sales/lead-detail.{wxml,wxss,js,json}
展示客户名称占位、需求描述、跟进状态、备注区域；字段由 onLoad(options) 传入，默认空字符串；不写真实客户/医院名称。

B-088 硬件发货记录页
只允许创建/修改 pages/sales/shipping-records.{wxml,wxss,js,json}
展示发货记录列表和空状态；records 默认空数组；不写真实快递单号；不调用接口。

B-089 激活码批量导入页
只允许创建/修改 pages/admin/activation-import.{wxml,wxss,js,json}
展示批量输入区域、导入说明、提交按钮；只做本地输入状态和 disabled；不写真实激活码。

B-090 激活码列表页
只允许创建/修改 pages/admin/activation-list.{wxml,wxss,js,json}
展示激活码列表区域、状态筛选、空状态；codes 默认空数组；不写真实激活码；不调用接口。

B-091 客户成功看板页
只允许创建/修改 pages/customer/success-dashboard.{wxml,wxss,js,json}
展示待开通、待绑定、待培训、待回访四个统计卡；全部默认 0；不调用接口。

B-092 客户培训记录页
只允许创建/修改 pages/customer/training-records.{wxml,wxss,js,json}
展示培训记录列表和空状态；records 默认空数组；不写真实医院/医生姓名；不调用接口。

B-093 客户回访记录页
只允许创建/修改 pages/customer/follow-up-records.{wxml,wxss,js,json}
展示回访记录列表、状态筛选、空状态；records 默认空数组；不写真实联系方式；不调用接口。

B-094 演示模式入口页
只允许创建/修改 pages/demo/index.{wxml,wxss,js,json}
展示产品演示、设备演示、AI 演示、传输演示四个入口；入口 toast“等待接入演示服务”；不写病历样例；不调用蓝牙/AI。

B-095 演示场景选择页
只允许创建/修改 pages/demo/scenario-select.{wxml,wxss,js,json}
展示门诊、住院、检查报告、随访记录四类场景；只做本地选择状态；不写场景正文样例。

B-096 演示结果页
只允许创建/修改 pages/demo/result.{wxml,wxss,js,json}
展示演示结果区域、发送到电脑按钮、返回按钮；resultText 默认空字符串；不写演示病历正文。

B-097 用户消息中心页
只允许创建/修改 pages/customer/messages.{wxml,wxss,js,json}
展示消息列表和空状态“暂无消息”；messages 默认空数组；不写真实通知内容；不调用接口。

B-098 服务到期提醒页
只允许创建/修改 pages/customer/expiry-reminder.{wxml,wxss,js,json}
展示服务状态、到期时间、联系客服入口、续期说明；不写价格；不写真实联系方式。

B-099 设备异常提醒页
只允许创建/修改 pages/customer/device-alert.{wxml,wxss,js,json}
展示异常类型、设备序列号、建议操作、提交工单按钮；字段由 onLoad(options) 传入；不调用蓝牙 API/接口。

B-100 传输异常提醒页
只允许创建/修改 pages/customer/transfer-alert.{wxml,wxss,js,json}
展示异常说明、可能原因、建议操作、重新测试按钮；不调用蓝牙 API/接口。

B-121 财务服务概览页
只允许创建/修改 pages/finance/service-overview.{wxml,wxss,js,json}
展示服务数量、有效服务、过期服务、待开通服务四个统计；默认 0；不写价格。

B-122 发票信息页
只允许创建/修改 pages/finance/invoice-info.{wxml,wxss,js,json}
展示发票抬头、税号、邮箱占位输入；只做本地表单状态；不调用接口。

B-123 财务记录列表页
只允许创建/修改 pages/finance/records.{wxml,wxss,js,json}
展示记录列表和空状态；records 默认空数组；不写价格；不调用接口。

B-124 集成状态页
只允许创建/修改 pages/integration/status.{wxml,wxss,js,json}
展示微信登录、后端 API、AI、OCR、ASR、蓝牙六个集成状态；字段由 options 传入；不调用接口。

B-125 微信登录说明页
只允许创建/修改 pages/integration/wechat-login-guide.{wxml,wxss,js,json}
展示微信登录接入步骤和注意事项；不调用微信 API。

B-126 AI Provider 配置说明页
只允许创建/修改 pages/integration/ai-provider-guide.{wxml,wxss,js,json}
展示模型、网关、脱敏、审核四个说明区；不写 API key；不写 prompt。

B-127 OCR Provider 配置说明页
只允许创建/修改 pages/integration/ocr-provider-guide.{wxml,wxss,js,json}
展示开源 OCR、上传、识别、确认四个说明区；不调用 OCR。

B-128 ASR Provider 配置说明页
只允许创建/修改 pages/integration/asr-provider-guide.{wxml,wxss,js,json}
展示录音、转写、确认、发送四个说明区；不调用录音 API/ASR。

B-129 发布版本列表页
只允许创建/修改 pages/release/version-list.{wxml,wxss,js,json}
展示版本列表和空状态；versions 默认空数组；不写真实发布日期。

B-130 发布版本详情页
只允许创建/修改 pages/release/version-detail.{wxml,wxss,js,json}
展示版本号、更新内容、风险项、回滚说明；字段由 options 传入。

B-131 发布回滚确认页
只允许创建/修改 pages/release/rollback-confirm.{wxml,wxss,js,json}
展示版本号、风险提示、原因输入、确认按钮；只做本地状态。

B-132 数据看板入口页
只允许创建/修改 pages/analytics/index.{wxml,wxss,js,json}
展示用户、设备、传输、AI、售后五个指标入口；入口 toast 占位。

B-133 用户指标页
只允许创建/修改 pages/analytics/users.{wxml,wxss,js,json}
展示总用户、已开通、已绑定、活跃用户四个指标；默认 0。

B-134 设备指标页
只允许创建/修改 pages/analytics/devices.{wxml,wxss,js,json}
展示总设备、已绑定、异常、待交付四个指标；默认 0。

B-135 传输指标页
只允许创建/修改 pages/analytics/transfers.{wxml,wxss,js,json}
展示传输次数、成功率、平均耗时、长文本通过率；默认 0。

B-136 售后指标页
只允许创建/修改 pages/analytics/support.{wxml,wxss,js,json}
展示工单数、待处理、已关闭、平均处理时间；默认 0。

B-137 系统维护入口页
只允许创建/修改 pages/maintenance/index.{wxml,wxss,js,json}
展示清理缓存、重建索引、导出日志、检查配置四个入口；全部 toast 占位。

B-138 系统维护日志页
只允许创建/修改 pages/maintenance/logs.{wxml,wxss,js,json}
展示日志列表和空状态；logs 默认空数组；不写真实日志。

B-139 配置检查结果页
只允许创建/修改 pages/maintenance/config-check.{wxml,wxss,js,json}
展示检查结果列表和空状态；results 默认空数组；不调用接口。

B-140 数据清理确认页
只允许创建/修改 pages/maintenance/cleanup-confirm.{wxml,wxss,js,json}
展示清理类型、风险提示、确认按钮；只 toast“等待接入维护服务”。

B-141 法律声明目录页
只允许创建/修改 pages/legal/index.{wxml,wxss,js,json}
展示用户协议、隐私政策、免责声明、数据处理说明入口；入口 toast 占位。

B-142 免责声明页
只允许创建/修改 pages/legal/disclaimer.{wxml,wxss,js,json}
展示结构化占位文案；不写绝对化法律承诺；不涉及具体医疗建议。

B-143 数据处理说明页
只允许创建/修改 pages/legal/data-processing.{wxml,wxss,js,json}
展示采集、存储、使用、删除四个区块；不写具体加密算法承诺。

B-144 管理员培训目录页
只允许创建/修改 pages/training/admin-index.{wxml,wxss,js,json}
展示付费用户创建、设备管理、服务记录、反馈处理四个培训入口；入口 toast 占位。

B-145 医生培训目录页
只允许创建/修改 pages/training/doctor-index.{wxml,wxss,js,json}
展示首次使用、绑定设备、发送文本、AI 整理、问题处理五个入口。

B-146 培训详情页
只允许创建/修改 pages/training/detail.{wxml,wxss,js,json}
展示标题、步骤、注意事项；title/steps/notices 由 options 传入或默认空。

B-147 培训完成页
只允许创建/修改 pages/training/done.{wxml,wxss,js,json}
展示完成提示、下一步入口、反馈入口；按钮 toast 占位。

B-148 培训反馈页
只允许创建/修改 pages/training/feedback.{wxml,wxss,js,json}
展示评分选择、反馈输入、提交按钮；只做本地状态；不调用接口。

B-149 最终验收总览页
只允许创建/修改 pages/release/final-acceptance.{wxml,wxss,js,json}
展示前端、蓝牙、账号、设备、AI、合规、后端、压测八个验收项；只做 checkbox 状态。

B-150 项目完成页
只允许创建/修改 pages/release/project-done.{wxml,wxss,js,json}
展示完成提示、待上线事项、下一步入口；按钮 toast 占位。
```
