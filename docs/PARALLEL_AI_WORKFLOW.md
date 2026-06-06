# 双 AI 并行开发工作流

## 1. 角色定义

### AI-A：Codex 技术总监

负责高风险和核心模块：

- 架构设计。
- 蓝牙/VUC/发送队列。
- 账号、付费用户、硬件绑定。
- 加密、脱敏、AI/OCR/ASR 核心链路。
- 代码审查。
- 合并前验收。

### AI-B：低成本执行 AI

负责低风险和可复制任务：

- 普通页面 WXML/WXSS。
- 表单交互。
- 静态列表和空状态。
- 帮助、教程、协议、客服、意见反馈。
- 根据明确模板补齐重复页面。

AI-B 不是架构决策者，不允许自行扩大任务范围。

## 2. 并行开发基本规则

每个任务必须先标明：

```text
任务编号：
负责 AI：
允许修改文件：
禁止修改文件：
验收标准：
是否需要 Codex Review：
```

没有写清允许修改文件的任务，不允许开工。

## 3. 文件锁规则

### Codex 专属文件

以下文件或目录只能由 Codex 修改：

```text
app.js
app.json
project.config.json
pages/home/home.js 中蓝牙和发送相关逻辑
services/auth/**
services/payment/**
services/device/**
services/security/**
services/ai/**
services/ocr/**
services/asr/**
utils/ble/**
utils/encoder/**
utils/logger/**
docs/TECH_LEAD_HANDOFF.md
docs/DEVELOPMENT_STANDARDS.md
docs/PARALLEL_AI_WORKFLOW.md
```

### AI-B 可修改文件

AI-B 只允许修改被任务明确点名的普通页面文件，例如：

```text
pages/profile/profile.wxml
pages/profile/profile.wxss
pages/profile/profile.js
pages/help/help.wxml
pages/help/help.wxss
pages/help/help.js
```

AI-B 不允许顺手修改全局样式、全局路由和公共模块。

## 4. 推荐并行节奏

### 第 0 阶段：规范和底座

Codex：

- 完成开发规范。
- 完成双 AI 工作流。
- 保护性封装蓝牙核心。
- 设计账号/付费用户数据模型。

AI-B：

- 暂不进入核心代码。
- 根据文档准备普通页面 UI。

### 第 1 阶段：MVP 首页和账号

Codex：

- 首页蓝牙逻辑保护性封装。
- 登录后购买状态判断。
- 设备绑定状态设计。
- 加密/脱敏方案设计。

AI-B：

- 注册页 UI。
- 找回密码 UI。
- 协议页 UI。
- 购买状态提示页 UI。

### 第 2 阶段：设备和记录

Codex：

- 设备绑定业务逻辑。
- 传输设置。
- 历史记录加密存储。

AI-B：

- 设备管理页 UI。
- 历史记录列表 UI。
- 传输设置页静态 UI。
- 空状态和错误状态。

### 第 3 阶段：AI/OCR/ASR

Codex：

- DeepSeek V4 接入。
- 脱敏网关。
- OCR/ASR 选型和服务接口。
- AI 结果发送前确认。

AI-B：

- AI 对话列表 UI。
- 模板库 UI。
- OCR 上传页 UI。
- 录音页 UI。

## 5. AI-B 任务卡模板

复制以下模板给 AI-B。也可以直接使用 `docs/LOW_COST_AI_INIT_PROMPT.md` 中的完整初始化提示词。

```text
任务编号：B-001
任务名称：
背景：

只允许修改：
- pages/xxx/xxx.wxml
- pages/xxx/xxx.wxss
- pages/xxx/xxx.js

禁止修改：
- app.js
- app.json
- app.wxss
- pages/home/home.js
- services/**
- utils/**
- docs/**

实现要求：
- 使用现有主色 #4A90E2。
- 不新增第三方依赖。
- 不调用真实接口。
- 不写 AI prompt。
- 不写真实病历或仿真病历正文。
- 所有按钮要有 disabled/loading 状态。

验收标准：
- 页面能在微信开发者工具打开。
- 无 WXML 明显语法错误。
- 交互函数存在，不报未定义。
- 完成后列出改动文件和主要逻辑。
```

## 6. Codex 任务卡模板

```text
任务编号：A-001
任务名称：
风险等级：高/中/低
涉及核心链路：是/否

允许修改：

保护要求：
- 保留现有行为。
- 不改变硬件协议语义。
- 提供回退路径。

验收标准：
- 说明修改前后差异。
- 给出测试样例。
- 更新相关文档。
```

## 7. 合并前检查

每次合并前必须确认：

- 是否修改了不该修改的文件。
- 是否影响蓝牙发送链路。
- 是否新增未评审依赖。
- 是否把明文病历写入日志或 mock。
- 是否写了页面级 mock、mock 延迟或 mock 成功。
- 是否需要 Codex Review。
- 是否更新任务状态。

## 8. 冲突处理

如果两个 AI 修改了同一文件：

1. 优先保留 Codex 对核心模块的修改。
2. AI-B 的 UI 改动逐块人工迁移。
3. 不使用盲目覆盖。
4. 冲突解决后必须重新跑相关页面检查。

如果 AI-B 修改了禁止文件：

1. 不合并。
2. 要求重新按任务范围提交。
3. 如果改动有价值，由 Codex 手动摘取。
