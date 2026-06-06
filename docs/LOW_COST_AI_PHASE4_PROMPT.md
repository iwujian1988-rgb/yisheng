# 低成本 AI 第四批任务提示词

把下面这段发给另一个 AI，用于第四批页面开发。

```text
继续参与病历传输小程序开发。请先阅读：
- docs/DEVELOPMENT_STANDARDS.md
- docs/PARALLEL_AI_WORKFLOW.md
- docs/TASK_ROADMAP.md
- docs/AI_TASK_SPLIT.md
- docs/CODE_REVIEW_CHECKLIST.md
- docs/REVIEW_LOG.md
- docs/SECURITY_AI_DATA_BOUNDARY.md

重要规则：
- 不要写页面级 mock 数据。
- 不要用 setTimeout 假装接口成功。
- 不调用真实接口。
- 不写 AI prompt。
- 不调用 DeepSeek/OCR/ASR。
- 不写真实或仿真的病历正文。
- AI、OCR、ASR 的核心逻辑全部由 Codex 接入。

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
- utils/**
- services/**
- docs/**

你下一批只做低风险 UI 页面：

任务 B-010：AI 对话列表页 UI
只允许创建/修改：
- pages/ai/index.wxml
- pages/ai/index.wxss
- pages/ai/index.js
- pages/ai/index.json

要求：
- 展示空状态：“暂无 AI 对话”。
- 展示新建对话按钮，但按钮只 toast “等待接入 AI 服务”。
- 不写对话 mock 列表。
- 不写 prompt。
- 不调用接口。
- 不修改 app.json。

任务 B-011：模板库页 UI
只允许创建/修改：
- pages/templates/index.wxml
- pages/templates/index.wxss
- pages/templates/index.js
- pages/templates/index.json

要求：
- 展示分类 tab：病历类、报告类、术语类、总结类。
- 列表默认空数组，空状态：“暂无可用模板”。
- 不写模板 prompt。
- 不写病历样例。
- 不调用接口。
- 不修改 app.json。

任务 B-012：OCR 上传页 UI
只允许创建/修改：
- pages/ocr/index.wxml
- pages/ocr/index.wxss
- pages/ocr/index.js
- pages/ocr/index.json

要求：
- 展示图片选择区域、识别结果区域、确认按钮。
- JS 只保留 chooseImage() 和 confirmResult() 函数入口。
- chooseImage() 只 toast “等待接入 OCR 服务”，不要调用 wx.chooseImage。
- 不写识别结果 mock。
- 不调用接口。
- 不修改 app.json。

任务 B-013：录音转写页 UI
只允许创建/修改：
- pages/asr/index.wxml
- pages/asr/index.wxss
- pages/asr/index.js
- pages/asr/index.json

要求：
- 展示录音按钮、转写结果区域、确认按钮。
- JS 只保留 startRecord()、stopRecord()、confirmResult() 函数入口。
- 只 toast “等待接入 ASR 服务”。
- 不调用录音 API。
- 不写转写结果 mock。
- 不修改 app.json。

交付格式：
1. 本次任务编号：
2. 修改文件：
3. 实现内容：
4. 未实现/占位内容：
5. 自检结果：
6. 是否修改了禁止文件：必须回答“否”
7. 是否写了页面级 mock：必须回答“否”
8. 是否写了 AI prompt 或调用 AI/OCR/ASR：必须回答“否”

如果你发现必须修改禁止文件，停止并说明，不要自行修改。
```

