# 低成本 AI 第六批任务提示词

把下面这段发给另一个 AI，用于第六批页面开发。

```text
继续参与病历传输小程序开发。请先阅读：
- docs/DEVELOPMENT_STANDARDS.md
- docs/PARALLEL_AI_WORKFLOW.md
- docs/TASK_ROADMAP.md
- docs/AI_TASK_SPLIT.md
- docs/CODE_REVIEW_CHECKLIST.md
- docs/REVIEW_LOG.md
- docs/AUTH_PAYMENT_DEVICE_ARCHITECTURE.md

重要规则：
- 不要写页面级 mock 数据。
- 不要用 setTimeout 假装接口成功。
- 不调用真实接口。
- 不实现购买状态判断。
- 不实现设备绑定真实逻辑。
- 不写真实或仿真的病历正文、患者信息。
- 购买、开通、设备绑定、售后状态逻辑全部由 Codex 接入。

绝对禁止修改：
- app.js
- app.json
- app.wxss
- project.config.json
- pages/home/home.js
- pages/login/login.js
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
- utils/**
- services/**
- docs/**

你下一批只做低风险 UI 页面：

任务 B-018：购买/开通提示页 UI
只允许创建/修改：
- pages/purchase/index.wxml
- pages/purchase/index.wxss
- pages/purchase/index.js
- pages/purchase/index.json

要求：
- 展示硬件购买后开通说明、联系销售/客服入口、已有激活码入口。
- 不写价格。
- 不写支付逻辑。
- 不调用接口。
- “联系客服”“输入激活码”按钮只 toast “等待接入开通服务”。
- 不修改 app.json。

任务 B-019：设备绑定表单页 UI
只允许创建/修改：
- pages/device/bind.wxml
- pages/device/bind.wxss
- pages/device/bind.js
- pages/device/bind.json

要求：
- 展示设备序列号输入框、校验码输入框、绑定按钮、连接提示。
- 只做本地输入状态和按钮 disabled。
- 不调用 services/device。
- 不实现真实绑定。
- 不修改 app.json。

任务 B-020：售后支持页 UI
只允许创建/修改：
- pages/support/index.wxml
- pages/support/index.wxss
- pages/support/index.js
- pages/support/index.json

要求：
- 展示售后入口：联系客服、设备故障、账号开通问题、传输异常。
- 不写真实电话、微信号、二维码。
- 按钮只 toast “等待接入客服服务”。
- 不调用接口。
- 不修改 app.json。

任务 B-021：操作教程列表页 UI
只允许创建/修改：
- pages/tutorials/index.wxml
- pages/tutorials/index.wxss
- pages/tutorials/index.js
- pages/tutorials/index.json

要求：
- 展示教程分类：首次连接、设备绑定、文本传输、常见问题。
- 列表默认空数组。
- 不写视频 mock 数据。
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
8. 是否实现购买/绑定真实逻辑：必须回答“否”

如果你发现必须修改禁止文件，停止并说明，不要自行修改。
```

