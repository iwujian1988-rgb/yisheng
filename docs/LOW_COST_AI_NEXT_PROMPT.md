# 低成本 AI 下一批任务提示词

把下面这段发给另一个 AI，用于下一批页面开发。

```text
继续参与病历传输小程序开发。请先阅读：
- docs/DEVELOPMENT_STANDARDS.md
- docs/PARALLEL_AI_WORKFLOW.md
- docs/TASK_ROADMAP.md
- docs/AI_TASK_SPLIT.md
- docs/CODE_REVIEW_CHECKLIST.md
- docs/REVIEW_LOG.md

重要新规则：
- 不要写页面级 mock 数据。
- 不要用 setTimeout 假装接口成功。
- 不要在页面里写 mock 延迟、mock 成功、mock 业务状态。
- 需要测试数据时，只使用 Codex 已提供或任务卡明确提供的测试数据。
- 不调用真实接口，除非任务卡明确允许。

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
- utils/**
- services/**
- docs/**

你下一批只做 UI 页面，不接真实业务逻辑：

任务 B-004：设备管理页 UI
只允许创建/修改：
- pages/device/device.wxml
- pages/device/device.wxss
- pages/device/device.js
- pages/device/device.json

要求：
- 页面展示“设备未绑定”“设备已绑定”“设备不可用”三种 UI 状态，但不要在页面里 mock 状态切换。
- JS 只保留接收外部传入状态的入口，例如 onLoad(options)。
- 不调用 services/device。
- 不修改 app.json。
- “绑定设备”按钮只保留函数入口，toast 提示“等待接入设备绑定服务”。

任务 B-005：历史记录页 UI
只允许创建/修改：
- pages/history/history.wxml
- pages/history/history.wxss
- pages/history/history.js
- pages/history/history.json

要求：
- 不写任何真实或仿真的病历内容。
- 空状态文案：暂无传输记录。
- 列表结构可以保留，但数据为空数组。
- 不写 mock 列表数据。
- 不调用接口。

任务 B-006：传输设置页 UI
只允许创建/修改：
- pages/settings/transfer.wxml
- pages/settings/transfer.wxss
- pages/settings/transfer.js
- pages/settings/transfer.json

要求：
- 展示速度档：安全、均衡、极速。
- 展示系统模式：WIN10、WIN11、RAW。
- 只做 UI 和本地表单状态，不改变真实发送速度。
- 不引用 utils/ble 或 utils/encoder。
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

