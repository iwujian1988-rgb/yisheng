# PRD 补充：权限与套餐体系

> 版本：v2.0 | 日期：2026-06-10
> 状态：已生效，替代 v1.0 的 audience/professional 区分模型
> 主文档：docs/MINIPROGRAM_PRD.md

## 1. 权限模型（v2.0）

### 1.1 两级门控

用户使用 AI 功能需同时满足两个条件，由前端统一把关：

1. **蓝牙已连接** — 前端本地状态，后端无法感知
2. **会员有效** — 后端 `memberStatus === 'active'`

### 1.2 权限矩阵

| 用户状态 | 蓝牙 | AI 功能 | TXT 传输 | 购买页 |
|---------|------|--------|---------|-------|
| 未登录 | — | ✗ | ✗ | 可访问 |
| 已登录，未连蓝牙 | ✗ | ✗ | ✗ | 可访问 |
| 已登录 + 蓝牙 + 非会员 | ✓ | ✗ | ✓ | 可访问 |
| 已登录 + 蓝牙 + 会员 | ✓ | ✓（全功能）| ✓ | 可访问 |

### 1.3 前端判断流程

```
用户点击 AI 功能入口
  → 检查蓝牙连接（未连接 → 弹窗提示连接设备）
  → 检查会员状态（非会员 → 弹窗引导购买页）
  → 通过 → 正常使用
```

### 1.4 后端判断流程

```
AI 相关 API 请求
  → requireUser（token 解析）
  → isMemberActive（memberStatus 检查）
  → 通过 → 执行业务
```

后端不校验蓝牙连接，不做设备绑定检查。

## 2. 套餐模型

### 2.1 一期：简化模型

- **无套餐概念**，只有到期时间（`memberEnd`）。
- 会员 = 全功能开放，不做功能项细分。
- 用户模型预留 `features` 字段（空对象 `{}`），二期启用。

### 2.2 开通方式（两种并存）

| 方式 | 触发方 | 流程 |
|------|-------|------|
| 管理员手动开通 | 后台管理 | 填手机号/用户ID + 到期时间 → 立即生效 |
| 激活码自助开通 | 用户 | 输入激活码 → 校验 → 计算到期时间 → 生效 |

### 2.3 会员状态

```
none → active（开通） → expired（到期） → active（续费）
                    → disabled（停用）
```

## 3. 废弃逻辑

以下 v1.0 逻辑已废弃，需从代码中移除：

- `audience` 字段区分 general / professional
- `hasBoundDevice` 作为 AI 功能门控
- `canAccessTemplate` / `canAccessQuickAction` 中的 audience 判断
- `requireMemberAndDevice` 中的设备绑定检查
- `enableAiSuiteForDev` 开关
- `deviceConnected` 前端传后端参数
- `defaultPrompts` 中的 professional / general 区分

## 4. 快捷指令配置原则

- 快捷指令由后端/后台配置下发，前端不硬编码。
- 一期所有快捷指令对会员统一可见，不区分 audience。
- 前端只展示后端返回的 title、description、placeholder。
- AI 网关在服务端校验会员状态，不依赖前端拦截。

## 5. 一期实施清单

| # | 改动 | 范围 |
|---|------|------|
| 1 | `guardAiFeature` 增加蓝牙检查 | services/entitlements/features.js |
| 2 | `guardAiFeature` 简化为蓝牙+会员 | services/entitlements/features.js |
| 3 | 移除 `enableAiSuiteForDev` | app.js, features.js |
| 4 | 移除 `audience` 判断 | user-api.js, provider-gateway.js |
| 5 | 移除 `hasBoundDevice` 门控 | provider-gateway.js, user-api.js |
| 6 | 统一 `defaultPrompt` | user-api.js |
| 7 | 用户模型加 `features` 字段 | admin.js, user-api.js, auth.js |
| 8 | 修激活码导入 bug | admin.js |
| 9 | 购买记录调后端 API | pages/purchase/records.js |
| 10 | 管理界面移除 audience | backend/public/admin/app.js |

## 6. 二期预留

| 项目 | 说明 |
|------|------|
| 套餐定义表 | 名称、包含功能、时长、价格 |
| `features` 字段启用 | 按功能开关控制 OCR/ASR/模板等 |
| 后台功能项配置 | 管理员可勾选用户可用的功能 |
| 订单管理 | 接入微信支付 |
| 到期自动降级 | 定时任务 |
| 续费/改套餐 | 用户自助操作 |
