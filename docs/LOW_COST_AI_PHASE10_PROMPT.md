# 低成本 AI 第十批任务提示词

把下面这段发给另一个 AI，用于第十批页面开发。

```text
继续参与病历传输小程序开发。请先阅读：
- docs/DEVELOPMENT_STANDARDS.md
- docs/PARALLEL_AI_WORKFLOW.md
- docs/TASK_ROADMAP.md
- docs/AI_TASK_SPLIT.md
- docs/CODE_REVIEW_CHECKLIST.md
- docs/REVIEW_LOG.md

重要规则：
- 不要写页面级 mock 数据。
- 不要用 setTimeout 假装接口成功。
- 不调用真实接口。
- 不写真实联系方式、二维码、价格。
- 不写真实或仿真的病历正文、患者信息。
- 设置、隐私、缓存、调试逻辑全部由 Codex 接入。

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
- pages/settings/transfer.*
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
- utils/**
- services/**
- docs/**

你下一批只做低风险 UI 页面：

任务 B-034：隐私设置页 UI
只允许创建/修改：
- pages/settings/privacy.wxml
- pages/settings/privacy.wxss
- pages/settings/privacy.js
- pages/settings/privacy.json

要求：
- 展示历史记录保存开关、AI 脱敏说明入口、清除本地数据入口。
- 只做本地 UI 状态，不清理真实数据。
- saveSettings() 只 toast “等待接入隐私设置服务”。
- 不调用接口。
- 不修改 app.json。

任务 B-035：通知设置页 UI
只允许创建/修改：
- pages/settings/notifications.wxml
- pages/settings/notifications.wxss
- pages/settings/notifications.js
- pages/settings/notifications.json

要求：
- 展示服务到期提醒、设备异常提醒、传输完成提醒三项开关。
- 只做本地 UI 状态。
- saveSettings() 只 toast “等待接入通知设置服务”。
- 不调用接口。
- 不修改 app.json。

任务 B-036：本地数据管理页 UI
只允许创建/修改：
- pages/settings/storage.wxml
- pages/settings/storage.wxss
- pages/settings/storage.js
- pages/settings/storage.json

要求：
- 展示历史记录、本地草稿、设备缓存三类数据项。
- 不读取真实 storage。
- 清理按钮只 toast “等待接入数据管理服务”。
- 不调用接口。
- 不修改 app.json。

任务 B-037：开发调试入口页 UI
只允许创建/修改：
- pages/dev/index.wxml
- pages/dev/index.wxss
- pages/dev/index.js
- pages/dev/index.json

要求：
- 展示测试账号说明入口、测试状态入口、清理测试数据入口。
- 不写真实病历内容。
- 不直接读写 storage。
- 所有按钮只 toast “等待接入开发工具服务”。
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
8. 是否调用真实接口或实现真实业务逻辑：必须回答“否”

如果你发现必须修改禁止文件，停止并说明，不要自行修改。
```

