# 低成本 AI 第三批任务提示词

把下面这段发给另一个 AI，用于第三批页面开发。

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
- 不要写 mock 延迟、mock 成功、mock 业务状态。
- 不调用真实接口，除非任务卡明确允许。
- 需要测试数据时，只使用 Codex 已提供或任务卡明确提供的测试数据。
- 不写真实或仿真的病历正文。

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
- utils/**
- services/**
- docs/**

你下一批只做低风险 UI 页面，不接真实业务逻辑：

任务 B-007：个人中心页 UI
只允许创建/修改：
- pages/profile/profile.wxml
- pages/profile/profile.wxss
- pages/profile/profile.js
- pages/profile/profile.json

要求：
- 展示用户信息区域、会员/服务状态入口、设备管理入口、传输设置入口、历史记录入口、帮助客服入口。
- 不读取真实用户数据。
- JS 只保留接收外部传入状态的入口，例如 onLoad(options)。
- 各入口按钮只保留函数入口，toast 提示“等待接入路由”。
- 不修改 app.json。

任务 B-008：帮助中心页 UI
只允许创建/修改：
- pages/help/help.wxml
- pages/help/help.wxss
- pages/help/help.js
- pages/help/help.json

要求：
- 展示 FAQ 折叠列表结构。
- FAQ 内容只写产品操作级说明，不写病历示例。
- 包含“蓝牙连接失败”“传输乱码”“如何联系售后”“如何绑定设备”等问题。
- 不调用接口。
- 不写 mock 列表数据以外的业务状态；FAQ 静态文案可以直接写在页面 data。

任务 B-009：协议与隐私政策页 UI
只允许创建/修改：
- pages/common/agreement.wxml
- pages/common/agreement.wxss
- pages/common/agreement.js
- pages/common/agreement.json

要求：
- 支持通过 options.type 展示 userAgreement 或 privacyPolicy。
- 文案先用结构化占位：服务说明、用户义务、隐私保护、医疗数据说明、第三方 AI 脱敏说明。
- 不写具体法律承诺，不写医疗合规绝对化表述。
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

如果你发现必须修改禁止文件，停止并说明，不要自行修改。
```

