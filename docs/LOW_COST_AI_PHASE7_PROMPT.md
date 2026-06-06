# 低成本 AI 第七批任务提示词

把下面这段发给另一个 AI，用于第七批页面开发。

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
- 不写真实电话、微信号、二维码。
- 不写真实或仿真的病历正文、患者信息。
- 客服、售后、反馈、教程数据源全部由 Codex 接入。

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
- pages/purchase/**
- pages/support/**
- pages/tutorials/**
- utils/**
- services/**
- docs/**

你下一批只做低风险 UI 页面：

任务 B-022：意见反馈页 UI
只允许创建/修改：
- pages/feedback/index.wxml
- pages/feedback/index.wxss
- pages/feedback/index.js
- pages/feedback/index.json

要求：
- 展示反馈类型选择：功能建议、使用问题、设备问题、其他。
- 展示反馈内容输入框、联系方式输入框、提交按钮。
- 只做本地输入状态和按钮 disabled。
- submitFeedback() 只 toast “等待接入反馈服务”。
- 不调用接口。
- 不修改 app.json。

任务 B-023：关于我们页 UI
只允许创建/修改：
- pages/about/index.wxml
- pages/about/index.wxss
- pages/about/index.js
- pages/about/index.json

要求：
- 展示产品名、版本号占位、服务说明入口、隐私政策入口。
- 不写公司真实信息、电话、地址、备案号。
- 按钮只保留函数入口并 toast “等待接入路由”。
- 不调用接口。
- 不修改 app.json。

任务 B-024：教程详情页 UI
只允许创建/修改：
- pages/tutorials/detail.wxml
- pages/tutorials/detail.wxss
- pages/tutorials/detail.js
- pages/tutorials/detail.json

要求：
- 展示标题区域、步骤列表区域、注意事项区域。
- title 默认为空字符串，steps 默认为空数组。
- 不写教程 mock 数据。
- 不写视频链接。
- 不调用接口。
- 不修改 app.json。

任务 B-025：设备故障提交页 UI
只允许创建/修改：
- pages/support/device-issue.wxml
- pages/support/device-issue.wxss
- pages/support/device-issue.js
- pages/support/device-issue.json

要求：
- 展示故障类型选择、问题描述输入框、设备序列号输入框、提交按钮。
- 只做本地输入状态和按钮 disabled。
- submitIssue() 只 toast “等待接入售后服务”。
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
8. 是否调用真实接口或写真实联系方式：必须回答“否”

如果你发现必须修改禁止文件，停止并说明，不要自行修改。
```

