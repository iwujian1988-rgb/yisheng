# 小程序开发技术规范

## 1. 总原则

本项目是硬件售卖驱动的医疗文本传输产品。工程优先级如下：

1. 已调通的蓝牙/VUC 传输链路稳定性。
2. 账号、付费用户、硬件绑定、权限校验。
3. 医疗文本加密、脱敏、AI 数据边界。
4. 小程序页面完整度和体验。

任何开发都不得为了页面进度破坏前三项。

后续开发禁止页面级 mock。需要测试时必须使用明确的测试数据、测试账号或测试环境服务入口，目标是每次交付都能直接在微信开发者工具或真机上测试。

## 2. 目录规划

后续按以下结构演进：

```text
repo/
├── app.js
├── app.json
├── app.wxss
├── pages/
│   ├── home/
│   ├── login/
│   ├── register/
│   ├── forgot-password/
│   ├── device/
│   ├── history/
│   ├── ai/
│   ├── templates/
│   └── profile/
├── components/
│   ├── app-button/
│   ├── app-input/
│   ├── empty-state/
│   ├── status-card/
│   └── progress-bar/
├── services/
│   ├── api/
│   ├── auth/
│   ├── device/
│   ├── payment/
│   ├── ai/
│   ├── ocr/
│   ├── asr/
│   └── security/
├── utils/
│   ├── ble/
│   ├── encoder/
│   ├── validators/
│   ├── logger/
│   └── constants/
└── docs/
```

目录职责：

- `pages/` 只放页面状态、事件绑定、页面跳转和轻量 UI 逻辑。
- `components/` 只放可复用 UI，不直接请求接口。
- `services/` 放业务服务、接口调用、鉴权、AI、加密、设备业务。
- `utils/` 放无业务副作用的工具和底层能力。
- `docs/` 放架构、任务、规范、评审记录。

## 3. 页面开发规范

页面 JS 不允许堆核心业务逻辑。页面只做：

- 读取和展示页面数据。
- 调用 service 或 utils。
- 响应用户点击、输入、跳转。
- 显示 toast/modal/loading。

页面 JS 不允许：

- 直接拼接 AI prompt。
- 直接处理病历加密/解密。
- 直接实现购买状态判断。
- 直接重写 BLE 分片和发送队列。
- 把长文本明文写入日志。

## 4. 蓝牙开发规范

蓝牙/VUC 逻辑是核心资产，必须遵守：

- 现有已调通逻辑作为行为基准。
- 优化必须小步进行。
- 先封装，再调参，不推倒重写。
- 不改变固件协议语义。
- 每次改动都要能说明对 3000 字/2 分钟目标的影响。

蓝牙模块未来应暴露：

```text
init()
searchDevices()
connect(deviceId)
disconnect()
getConnectionState()
sendText(text, options)
cancelSend()
onProgress(callback)
onLog(callback)
```

编码模块未来应暴露：

```text
textToTokens(text, options)
tokenToPacket(token, options)
estimateSendTime(tokens, speedProfile)
```

## 5. 账号和付费用户规范

账号体系必须同时处理身份和购买资格。

登录成功后不能直接进入完整功能，需要得到后端返回：

```text
user
token
purchaseStatus
deviceBindingStatus
serviceStatus
```

状态建议：

```text
unregistered
registered_not_paid
paid_not_bound
active
disabled
expired
device_conflict
```

小程序根据状态决定：

- 未购买：进入购买/联系开通提示。
- 已购买未绑定：进入设备绑定流程。
- 已绑定可用：进入首页。
- 禁用/过期：进入客服或续费提示。

后台管理必须保留审计记录：

- 谁创建了付费用户。
- 谁绑定/解绑了设备。
- 谁禁用了用户或设备。
- 操作时间和原因。

## 6. 医疗数据和 AI 规范

医疗文本处理链路：

```text
用户输入/OCR/ASR
-> 本地临时文本
-> 脱敏
-> AI
-> 用户确认
-> 可选加密存储
-> 发送到电脑
```

禁止：

- 明文病历进入普通日志。
- 明文病历进入埋点。
- 管理员后台直接查看明文。
- 未经用户确认把 AI 输出直接发送到电脑。
- 低成本 AI 修改核心 prompt 和脱敏策略。

AI prompt 必须集中管理在 `services/ai/`，页面不得散写 prompt。

## 7. 接口调用规范

所有接口统一通过 `services/api` 或 `app.request` 的后续封装调用。

没有后端时，不允许页面自行 `setTimeout` 假装成功，也不允许在页面里写临时 mock。必须由 Codex 在 `services/dev/**` 提供测试数据服务。页面调用 service，service 决定走测试数据还是真实 API。

接口返回结构建议：

```json
{
  "code": "OK",
  "message": "",
  "data": {}
}
```

错误码必须可读，例如：

```text
AUTH_TOKEN_EXPIRED
USER_NOT_PAID
DEVICE_ALREADY_BOUND
DEVICE_DISABLED
CONTENT_TOO_LARGE
AI_NEEDS_RETRY
```

页面只展示用户可理解文案，不直接展示内部错误码。

## 8. 样式规范

使用现有主视觉：

- 主色：`#4A90E2`
- 深主色：`#357ABD`
- 成功：`#52C41A`
- 警告：`#FAAD14`
- 错误：`#F5222D`
- 背景：`#F5F7FA`
- 主文字：`#333333`
- 次文字：`#666666`
- 边框：`#E5E5E5`

普通页面遵循：

- 卡片圆角不超过 8px，除非现有页面已使用更大圆角。
- 表单按钮高度优先 52px。
- 重要操作必须有 disabled/loading 状态。
- 不在页面里写大段说明文案，医生现场使用要短、准、可执行。

## 9. 测试和验收

最低验收：

- `app.json` 所有页面路径存在。
- JSON 文件可解析。
- 页面无明显 WXML 绑定错误。
- 登录状态跳转符合购买状态。
- 蓝牙发送保留原有行为。
- 3000 字传输有时间估算和真机测试记录。

核心链路验收：

- 短文本中文上屏正确。
- 英文、数字、单位、中文标点正确。
- 100 字、500 字、1000 字、3000 字分级测试。
- 取消发送有效。
- 断连后 UI 状态正确。
- 失败不泄露明文病历。

## 10. 禁止事项

- 禁止低成本 AI 修改蓝牙/VUC 核心逻辑。
- 禁止未评审修改 `app.json` 路由。
- 禁止新增未经确认的第三方依赖。
- 禁止把真实病历写入 mock、日志、截图。
- 禁止页面级 mock 数据、mock 延迟、mock 成功。
- 禁止为了赶页面复制大量重复逻辑。
- 禁止把 AI prompt 散落在多个页面。
