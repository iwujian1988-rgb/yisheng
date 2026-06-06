# 低成本 AI Phase 13 提示词

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
- utils/**
- services/**
- docs/**

除非任务卡明确允许，否则不要修改任何未点名文件。

你下一批只做低风险 UI 页面，本轮任务较多，请一次完成 B-046 到 B-055：

任务 B-046：发送失败原因选择页 UI
只允许创建/修改：
- pages/transfer/failure-reason.wxml
- pages/transfer/failure-reason.wxss
- pages/transfer/failure-reason.js
- pages/transfer/failure-reason.json

要求：
- 展示失败原因分类：设备未连接、电脑未聚焦、文本过长、传输中断、其他。
- 展示问题描述输入框和提交按钮。
- 只做本地输入状态和按钮 disabled。
- submitReason() 只 toast “等待接入传输异常服务”。
- 不调用蓝牙 API。
- 不调用接口。
- 不修改 app.json。

任务 B-047：传输草稿箱页 UI
只允许创建/修改：
- pages/transfer/drafts.wxml
- pages/transfer/drafts.wxss
- pages/transfer/drafts.js
- pages/transfer/drafts.json

要求：
- 展示草稿列表区域和空状态：“暂无草稿”。
- drafts 默认为空数组。
- 不写草稿 mock 数据。
- 不写医疗文本示例。
- 继续编辑/删除按钮只 toast “等待接入草稿服务”。
- 不调用接口。
- 不修改 app.json。

任务 B-048：长文本检测提示页 UI
只允许创建/修改：
- pages/transfer/long-text-check.wxml
- pages/transfer/long-text-check.wxss
- pages/transfer/long-text-check.js
- pages/transfer/long-text-check.json

要求：
- 展示文本字数、预计耗时、风险提示、继续发送按钮、返回编辑按钮。
- count/estimatedSeconds 由 onLoad(options) 传入，默认 0。
- 不自己计算真实发送耗时。
- continueSend() 只 toast “等待接入长文本发送服务”。
- 不调用蓝牙 API。
- 不修改 app.json。

任务 B-049：传输速度校准页 UI
只允许创建/修改：
- pages/settings/speed-calibration.wxml
- pages/settings/speed-calibration.wxss
- pages/settings/speed-calibration.js
- pages/settings/speed-calibration.json

要求：
- 展示安全、均衡、极速三档校准说明。
- 展示“开始校准”按钮和校准结果区域。
- result 默认为空字符串。
- startCalibration() 只 toast “等待接入校准服务”。
- 不调用蓝牙 API。
- 不引用 utils/ble 或 utils/encoder。
- 不修改 app.json。

任务 B-050：医院电脑环境选择页 UI
只允许创建/修改：
- pages/settings/computer-env.wxml
- pages/settings/computer-env.wxss
- pages/settings/computer-env.js
- pages/settings/computer-env.json

要求：
- 展示环境选择：普通输入框、网页系统、远程桌面、虚拟机、未知。
- 只做本地选择状态。
- saveEnv() 只 toast “等待接入环境设置服务”。
- 不写医院真实名称。
- 不调用接口。
- 不修改 app.json。

任务 B-051：设备固件信息页 UI
只允许创建/修改：
- pages/device/firmware.wxml
- pages/device/firmware.wxss
- pages/device/firmware.js
- pages/device/firmware.json

要求：
- 展示固件版本、协议版本、升级状态、检查更新按钮。
- 所有字段由 onLoad(options) 传入，默认空字符串。
- 不写真实固件下载链接。
- checkUpdate() 只 toast “等待接入固件服务”。
- 不调用接口。
- 不调用蓝牙 API。
- 不修改 app.json。

任务 B-052：设备解绑确认页 UI
只允许创建/修改：
- pages/device/unbind-confirm.wxml
- pages/device/unbind-confirm.wxss
- pages/device/unbind-confirm.js
- pages/device/unbind-confirm.json

要求：
- 展示设备序列号、解绑风险提示、原因选择、确认解绑按钮。
- serialNo 由 onLoad(options) 传入，默认空字符串。
- 只做本地选择状态和按钮 disabled。
- confirmUnbind() 只 toast “等待接入设备服务”。
- 不调用接口。
- 不修改 app.json。

任务 B-053：AI 内容类型选择页 UI
只允许创建/修改：
- pages/ai/type-select.wxml
- pages/ai/type-select.wxss
- pages/ai/type-select.js
- pages/ai/type-select.json

要求：
- 展示内容类型：整理文本、润色表达、生成摘要、术语校对、格式规范。
- 只做本地选择状态。
- continueNext() 只 toast “等待接入 AI 服务”。
- 不写 AI prompt。
- 不调用 DeepSeek/OCR/ASR。
- 不写医疗文本示例。
- 不修改 app.json。

任务 B-054：AI 结果审核页 UI
只允许创建/修改：
- pages/ai/review-result.wxml
- pages/ai/review-result.wxss
- pages/ai/review-result.js
- pages/ai/review-result.json

要求：
- 展示 AI 输出结果区域、用户确认提示、重新生成、发送到电脑、返回编辑按钮。
- resultText 默认为空字符串，可由 onLoad(options) 传入。
- 不写 AI 结果 mock。
- 不写病历/报告样例。
- 所有按钮只 toast “等待接入 AI 服务”。
- 不调用 AI/OCR/ASR。
- 不修改 app.json。

任务 B-055：管理员不可见说明页 UI
只允许创建/修改：
- pages/common/encryption-note.wxml
- pages/common/encryption-note.wxss
- pages/common/encryption-note.js
- pages/common/encryption-note.json

要求：
- 展示“用户可见、管理员不可见明文”的说明结构。
- 展示本地保存、云端保存、第三方 AI 脱敏发送三个区块。
- 不写绝对化法律承诺。
- 不写具体加密算法承诺。
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

额外自检：
- 所有 JS 必须通过 `node --check`。
- 不要修改 app.json，路由由 Codex 统一接入。
- 不要修改 docs，这份任务卡之外的文档由 Codex 维护。
- 如果发现必须修改禁止文件，停止并说明原因，不要自行修改。
```
