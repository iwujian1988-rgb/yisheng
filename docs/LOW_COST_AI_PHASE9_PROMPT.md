# 低成本 AI 第九批任务提示词

把下面这段发给另一个 AI，用于第九批页面开发。

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
- 不写真实联系方式、二维码、价格。
- 不实现激活、订单、设备、账号真实逻辑。
- 不写真实或仿真的病历正文、患者信息。
- 激活、购买记录、设备详情、账号资料逻辑全部由 Codex 接入。

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
- pages/device/device.*
- pages/device/bind.*
- pages/history/**
- pages/settings/**
- pages/profile/profile.*
- pages/help/**
- pages/common/**
- pages/ai/**
- pages/templates/**
- pages/ocr/**
- pages/asr/**
- pages/purchase/index.*
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

任务 B-030：激活码开通页 UI
只允许创建/修改：
- pages/purchase/activate.wxml
- pages/purchase/activate.wxss
- pages/purchase/activate.js
- pages/purchase/activate.json

要求：
- 展示激活码输入框、开通说明、提交按钮。
- 只做本地输入状态和按钮 disabled。
- submitActivation() 只 toast “等待接入开通服务”。
- 不调用接口。
- 不修改 app.json。

任务 B-031：购买/服务记录页 UI
只允许创建/修改：
- pages/purchase/records.wxml
- pages/purchase/records.wxss
- pages/purchase/records.js
- pages/purchase/records.json

要求：
- 展示服务记录列表区域和空状态。
- records 默认为空数组。
- 不写订单 mock 数据。
- 不写价格。
- 不调用接口。
- 不修改 app.json。

任务 B-032：设备详情页 UI
只允许创建/修改：
- pages/device/detail.wxml
- pages/device/detail.wxss
- pages/device/detail.js
- pages/device/detail.json

要求：
- 展示设备型号、设备序列号、绑定状态、固件版本、操作区。
- 所有字段由 onLoad(options) 传入，默认空字符串。
- 不写设备 mock 数据。
- 操作按钮只 toast “等待接入设备服务”。
- 不调用接口。
- 不修改 app.json。

任务 B-033：个人资料页 UI
只允许创建/修改：
- pages/profile/edit.wxml
- pages/profile/edit.wxss
- pages/profile/edit.js
- pages/profile/edit.json

要求：
- 展示昵称输入框、手机号展示、保存按钮。
- 昵称由 onLoad(options) 传入，默认为空字符串。
- 不实现真实保存。
- saveProfile() 只 toast “等待接入账号服务”。
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

