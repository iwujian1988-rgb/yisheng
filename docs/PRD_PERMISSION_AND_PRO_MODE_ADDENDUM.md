# PRD 补充：权限与可见性控制

> 版本：v3.0 | 日期：2026-06-11
> 状态：已生效，替代 v2.0
> 主文档：docs/MINIPROGRAM_PRD.md

## 1. 权限模型（v3.0）

### 1.1 三级门控

| 层级 | 控制方 | 说明 |
|------|--------|------|
| 1. 会员守卫 | 前端 | 非会员无法进入 AI 功能页面 |
| 2. 蓝牙连接状态 | 前端→后端 | 前端将蓝牙状态通过 API 参数传给后端 |
| 3. 内容可见性 | 后端 | 根据 connected 参数 + 会员状态决定返回什么内容 |

### 1.2 权限矩阵

| 用户状态 | 蓝牙 | AI 功能 | 看到的内容 | TXT 传输 |
|---------|------|--------|-----------|---------|
| 未登录 | — | ✗ | — | ✗ |
| 已登录，未连蓝牙 | ✗ | ✗ | — | ✗ |
| 已登录 + 蓝牙 + 非会员 | ✓ | ✗ | — | ✓ |
| 已登录 + 非会员 | — | ✗ | 通用模板（办公类） | ✗ |
| 已登录 + 会员 + 未连蓝牙 | ✗ | ✓ | 通用模板 + 通用快捷方式 | ✗ |
| 已登录 + 会员 + 已连蓝牙 | ✓ | ✓ | 专业模板 + 专业快捷方式 | ✓ |

### 1.3 后端内容过滤规则

模板和快捷操作的可见性由后端根据前端传入的 `connected` 参数控制：

```
前端请求 → /api/ai/templates?connected=true/false
                         /api/ai/quick-actions?connected=true/false

后端过滤逻辑：
  audience === 'general'      → connected=false 时可见
  audience === 'professional' → connected=true 且会员有效时可见
```

前端不做任何过滤，只展示后端返回的内容。

### 1.4 设计理由

这种设计的目的是应对小程序审核：

1. **审核员测试时**（无蓝牙设备 + 非会员）：看到的是通用办公工具
2. **审核员有测试会员**（无蓝牙设备）：仍然只看到通用内容
3. **真实用户**（会员 + 蓝牙设备连接）：看到专业内容
4. **前端代码**：零医疗关键词，零过滤逻辑，只有一个通用的 `?connected=true` 参数

### 1.5 前端判断流程

```
用户点击 AI 功能入口
  │
  ├─ 1. 检查会员状态（purchaseStatus === 'paid'）
  │     非会员 → 弹窗「需开通传输服务」→ 引导购买页
  │
  └─ 2. 通过 → 正常使用
```

注意：前端不检查蓝牙连接状态作为功能入口门控。蓝牙状态只在请求 API 时作为参数传递，以及在"发送到电脑"时检查。

### 1.6 后端判断流程

```
AI 相关 API 请求
  → requireUser（token 解析）
  → isMemberActive（memberStatus 检查）
  → 读取 query.connected 参数
  → 按 connected 值过滤返回内容
```

## 2. 智能创作模块（v3.0 新增）

### 2.1 模块定位

智能创作替代原有的"智能润色 + 快捷任务"模式，改为：

- **去掉快捷任务芯片**：不再让用户选择任务类型
- **纯自由输入**：用户丢什么内容进去，AI 自动判断类型并整理
- **单轮处理**：不是多轮聊天，是 input → AI process → output 的单次处理
- **内联语音/图片**：ASR 和 OCR 结果直接填入输入框，不跳转独立页面

### 2.2 与模板的分工

| | 智能创作 | 模板 |
|--|--------|------|
| 适合 | 不确定用什么格式、内容杂、想快速处理 | 明确知道要什么格式 |
| 输入 | 自由文本 | 结构化字段 |
| 输出 | AI 自动判断格式 | 固定科室结构 |
| 步骤 | 输入→整理→完成 | 选模板→填字段→生成 |

### 2.3 废弃内容

以下在 v2.0 中存在但 v3.0 中废弃：

- **快捷任务芯片**（quickActions 前端展示）
- **多轮 chat 界面**（改为单轮 input/output）
- **任务选择交互**
- 后端 `quickActions` 数据和接口保留，但前端不再使用

## 3. 废弃逻辑

以下逻辑已废弃，需从代码中移除：

- 前端蓝牙连接状态作为功能入口门控（改为只传参数给后端）
- 前端根据蓝牙状态过滤模板/快捷操作列表（改为后端过滤）
- 快捷任务芯片 UI 组件
- 多轮 chat 消息列表
- `enableAiSuiteForDev` 开关
- `defaultPrompts` 中的 professional / general 区分

## 4. 实施清单

| # | 改动 | 范围 |
|---|------|------|
| 1 | 后端 `canAccessTemplate` / `canAccessQuickAction` 加入 connected 参数 | user-api.js |
| 2 | 后端 `listTemplates` / `listQuickActions` 从 query 读 connected | user-api.js |
| 3 | 后端 `templateDetail` / `generateTemplate` 读取 connected | user-api.js |
| 4 | 前端删除蓝牙过滤逻辑，改为传 connected 参数 | templates/index.js, ai/detail.js |
| 5 | 前端 `listTemplates(connected)` / `listQuickActions(connected)` 传参 | catalog.js, quick-actions.js |
| 6 | 智能创作页面重构为 input/output 单轮模式 | pages/ai/detail.js, detail.wxml, detail.wxss |
| 7 | 智能创作默认提示词改强 | provider-gateway.js |
| 8 | 前端零医疗关键词检查 | 全局 |
