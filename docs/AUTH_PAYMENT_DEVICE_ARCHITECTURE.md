# 账号、开通与设备绑定架构

> 日期：2026-06-10（v2.0 更新）

## 1. 当前决策

小程序主登录流使用微信登录。手机号/账号登录保留为本地和辅助测试能力。

用户使用核心功能的权限模型（v2.0）：

- **AI 功能**：需蓝牙已连接 + 会员有效（memberStatus = active）。前端检查蓝牙，后端只检查会员状态。
- **TXT 传输**：需蓝牙已连接即可，不需要会员。
- 设备绑定是业务动作，不作为功能门控。

小程序主登录流使用微信登录。手机号/账号登录保留为本地和辅助测试能力。

用户能进入核心传输功能必须同时满足：

```text
purchaseStatus = paid
deviceBindingStatus = bound
serviceStatus = active
```

## 2. 主流程

```text
wx.login
-> POST /api/auth/wechat-login
-> 后端交换 openid/unionid
-> 后端创建或查找用户
-> 用户输入激活码或管理员后台开通
-> POST /api/purchase/activate 或 POST /api/admin/paid-users
-> 管理员预置设备 serialNo/proofCode
-> 用户输入 serialNo/proofCode
-> POST /api/devices/bind
-> GET /api/auth/me 刷新用户态
-> 前端检查蓝牙连接 + 会员状态
-> 连接蓝牙 + 会员 → 进入 AI 功能
-> 连接蓝牙 + 非会员 → 只能 TXT 传输
```

## 3. 身份与状态

身份：

- Primary identity: `openid`
- Cross-app identity: `unionid`
- Phone: optional contact/profile field
- Paid access: activation code or admin opening
- Hardware ownership: device serial number + proofCode

账号状态：

```text
registered_not_paid
paid_not_bound
active
disabled
expired
device_conflict
```

## 4. 后端职责

- `POST /api/auth/wechat-login`
- `GET /api/auth/me`
- `POST /api/purchase/activate`
- `POST /api/devices/bind`
- `POST /api/devices/unbind`
- `POST /api/admin/activation-codes/import`
- `POST /api/admin/devices`
- `POST /api/admin/devices/import`
- `POST /api/admin/devices/{id}/unbind`

后端必须：

- 校验用户是否 active 后再允许绑定设备。
- 校验设备是否已预置或是否允许未知设备绑定。
- 校验 proofCode。
- 只保存 proofCode 哈希。
- 返回统一 session payload 给小程序。
- 记录管理员导入、预置、强制解绑等审计日志。

## 5. 设备 proofCode 策略

设备预置字段：

```json
{
  "serialNo": "TXT-HID-001",
  "proofCode": "2468",
  "reservedUserId": "user_xxx"
}
```

存储规则：

- `proofCode` 使用 PBKDF2 哈希后保存为 `proofCodeHash`。
- 前台和后台响应只返回 `hasProofCode`。
- 不返回 proofCode 明文。
- 不返回 `proofCodeHash`。
- 绑定时 proofCode 错误返回 `DEVICE_PROOF_INVALID`。
- 设备预留给其他用户时返回 `DEVICE_RESERVED_FOR_OTHER_USER`。

## 6. 小程序职责

- 调用 `wx.login()`。
- 保存后端返回 token 和 session 状态。
- 激活成功后刷新 `/api/auth/me`。
- 设备绑定成功后刷新 `/api/auth/me`。
- 根据状态跳转：
  - `active` -> 首页
  - `registered_not_paid` -> 激活页
  - `paid_not_bound` -> 设备绑定页
  - `expired/disabled/device_conflict` -> 状态页

## 7. 管理员限制

管理员不得：

- 查看用户历史正文明文。
- 导出用户正文明文。
- 查看 proofCode 明文。
- 查看 `proofCodeHash`。
- 查看未脱敏 AI/OCR/ASR 输入输出。

管理员可以：

- 导入激活码。
- 预置设备。
- 批量导入设备。
- 强制解绑设备。
- 查看掩码用户身份和设备 metadata。

## 8. 本地开发与生产

本地开发：

- `app.globalData.baseUrl` 为空时，小程序使用本地演示分支。
- 后端默认 `STORE_MODE=file` 写入 `backend/data/store.json`。

生产/试点：

- 必须配置真实 `WECHAT_APP_ID/WECHAT_APP_SECRET`。
- 推荐 `STORE_MODE=mysql` 或等价持久化。
- `NODE_ENV=production` 默认拒绝 `STORE_MODE=file`。
- 推荐 `ALLOW_UNKNOWN_DEVICE_BINDING=false`。
- 交付前运行 `npm run release:check`。
