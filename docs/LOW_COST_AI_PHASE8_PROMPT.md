# 低成本 AI 第八批任务提示词

把下面这段发给另一个 AI，用于第八批页面开发。

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
- 网络测试、连接教程、传输完成和错误处理逻辑全部由 Codex 接入。

绝对禁止修改：
- app.js
- app.json
- app.wxss
- project.config.json
- pages/home/home.js
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
- utils/**
- services/**
- docs/**

你下一批只做低风险 UI 页面：

任务 B-026：网络测试页 UI
只允许创建/修改：
- pages/network-test/index.wxml
- pages/network-test/index.wxss
- pages/network-test/index.js
- pages/network-test/index.json

要求：
- 展示测试项目：蓝牙适配器、设备连接、写入特征、发送延迟。
- results 默认为空数组。
- startTest() 只 toast “等待接入测试服务”。
- 不调用蓝牙 API。
- 不调用接口。
- 不修改 app.json。

任务 B-027：连接教程页 UI
只允许创建/修改：
- pages/tutorials/connect-guide.wxml
- pages/tutorials/connect-guide.wxss
- pages/tutorials/connect-guide.js
- pages/tutorials/connect-guide.json

要求：
- 展示步骤区域、设备指示灯说明区域、常见问题入口。
- steps 默认为空数组。
- 不写视频链接。
- 不写教程 mock 数据。
- 不调用接口。
- 不修改 app.json。

任务 B-028：传输完成页 UI
只允许创建/修改：
- pages/transfer/result.wxml
- pages/transfer/result.wxss
- pages/transfer/result.js
- pages/transfer/result.json

要求：
- 展示成功/失败两种状态区域。
- status 由 onLoad(options) 传入，默认 success。
- 不写真实传输记录。
- 按钮：返回首页、查看历史；只保留函数入口并 toast “等待接入路由”。
- 不调用接口。
- 不修改 app.json。

任务 B-029：通用错误页 UI
只允许创建/修改：
- pages/error/index.wxml
- pages/error/index.wxss
- pages/error/index.js
- pages/error/index.json

要求：
- 展示错误标题、错误说明、主操作按钮、次操作按钮。
- title/message 由 onLoad(options) 传入。
- 不写具体错误 mock 数据。
- 按钮只 toast “等待接入路由”。
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
8. 是否调用真实接口或蓝牙 API：必须回答“否”

如果你发现必须修改禁止文件，停止并说明，不要自行修改。
```

