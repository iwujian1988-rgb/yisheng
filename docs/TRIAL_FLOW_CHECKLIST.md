# 试点联调检查清单

> 日期：2026-06-08  
> 范围：管理员开通、激活码、设备绑定、用户态刷新、进入首页。

## 1. 后端自动验证

运行：

```bash
cd backend
npm run smoke:trial-flow
```

通过标志：

```text
TRIAL_FLOW_SMOKE_OK
```

脚本覆盖：

1. 管理员登录。
2. 管理员导入激活码。
3. 用户微信登录。
4. 用户使用激活码开通服务。
5. 管理员通过 `POST /api/admin/devices` 为该用户预置专业设备和 proofCode。
6. 管理员通过 `POST /api/admin/devices/import` 批量导入设备，验证坏行错误明细。
7. 用户使用错误 proofCode 绑定失败。
8. 用户使用正确 proofCode 绑定成功。
9. `/api/auth/me` 返回 `paid + bound + active + professional`。
10. 激活码状态变为 `used`。
11. 设备返回对象不暴露 `proofCodeHash`。

## 2. 管理员操作路径

1. 登录管理后台。
2. 导入或创建激活码。
3. 可选：通过设备管理接口为用户预置设备序列号、模板权限、proofCode；多台设备可用批量导入。
4. 检查激活码列表中状态为 `unused`。
5. 用户激活后，检查状态变为 `used`。
6. 检查审计日志存在导入、开通、设备相关记录。

## 3. 用户操作路径

1. 微信登录或账号登录。
2. 未开通用户进入开通/激活页。
3. 输入激活码。
4. 激活成功后进入设备绑定页。
5. 输入设备序列号和 proofCode。
6. 绑定成功后刷新用户态并进入首页。
7. 首页可以加载草稿并发送。

## 4. 状态判定

| 阶段 | purchaseStatus | deviceBindingStatus | serviceStatus | accountStatus |
|---|---|---|---|---|
| 新用户 | `none` | `not_bound` | `none` | `registered_not_paid` |
| 激活后 | `paid` | `not_bound` | `active` | `paid_not_bound` |
| 绑定后 | `paid` | `bound` | `active` | `active` |

## 5. 安全边界

- 管理员列表只看手机号掩码、设备序列号、服务状态，不看用户正文。
- 激活码列表显示掩码，不暴露完整使用人敏感信息。
- 设备 proofCode 只保存哈希，不返回 `proofCodeHash`。
- 历史记录只保存 `ciphertext/envelope`。
- OCR/ASR/AI 结果必须经用户确认后进入草稿或发送。

## 6. 失败排查

| 问题 | 优先检查 |
|---|---|
| 激活码无效 | 是否已导入、是否已使用、大小写是否一致 |
| 激活后仍进不了绑定页 | `/api/auth/me` 和本地 session 是否刷新 |
| 绑定提示未开通 | 用户 `serviceStatus` 是否为 `active` |
| proofCode 错误 | 管理员预置的 proofCode 是否和用户输入一致 |
| 设备已被绑定 | 设备是否已绑定其他用户，是否需要后台强制解绑 |
| 绑定成功仍进不了首页 | `accountStatus` 是否为 `active` |
| 专业模板不可见 | 设备是否为 `professional` 权限，或序列号是否以 `PRO-` 开头 |

## 7. 本轮不解决

- 真实微信支付。
- 大规模管理员权限矩阵。
- 复杂硬件签名算法。
- 多设备同时绑定策略。
