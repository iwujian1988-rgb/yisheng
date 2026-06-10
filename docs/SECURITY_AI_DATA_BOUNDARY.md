# 医疗文本安全与 AI 数据边界

> 日期：2026-06-08
> 目标：保证 OCR/ASR/AI/历史记录/后台审计都不泄露用户明文。

## 1. 核心原则

- 医疗或办公正文进入第三方 AI 前，必须先经过脱敏处理。
- 日志、埋点、错误上报、测试数据和后台列表不得保存用户明文正文。
- OCR/ASR/AI 输出不得绕过用户确认页直接发送。
- 管理员只能看到 metadata，例如来源、长度、状态、时间、设备序列号、掩码用户身份。

## 2. 当前核心模块

```text
services/security/redaction.js
services/security/content-guard.js
services/security/crypto.js
services/ai/assistant.js
services/ocr/recognizer.js
services/asr/transcriber.js
backend/src/modules/provider-gateway.js
```

这些模块负责：

- 第三方 AI 调用前脱敏。
- 生成安全输入摘要。
- 阻止明文写入日志和后台列表。
- 以受保护 payload 保存历史正文。
- OCR/ASR 统一进入确认页。

## 3. 脱敏范围

首批至少覆盖：

- 手机号。
- 身份证号。
- 病案号、住院号、门诊号、医保号、就诊卡号。
- 姓名、患者、病人等标签后的姓名字段。
- 地址、住址、家庭住址字段。

测试示例只能描述字段类型，不写真实或仿真的个人信息。

## 4. AI 调用边界

AI 调用流程必须是：

```text
用户输入
-> services/security/content-guard.prepareTextForThirdPartyAi()
-> services/ai/prompts.js
-> services/ai/provider.js 或后端 /api/ai/assistant
-> 用户审核输出
-> 可选保存或发送到电脑
```

页面不得直接调用 DeepSeek/OpenAI-compatible provider，也不得直接拼接 prompt。

当前后端支持 OpenAI-compatible provider。未配置 provider 时，后端返回 `status: not_configured` 的确定性本地 fallback。

## 5. OCR/ASR 边界

OCR/ASR 流程必须是：

```text
图片/音频
-> 后端 gateway
-> worker
-> 小程序确认页
-> 用户编辑确认
-> 首页草稿或发送
```

要求：

- 失败时只显示可理解的错误，不记录图片、音频、识别正文。
- 识别结果不直接进入发送队列。
- 确认页允许用户编辑。
- 进入历史保存前必须走受保护 payload。

## 6. 历史记录存储边界

历史列表只展示：

- 来源类型。
- 文本长度。
- 发送状态。
- 创建时间。
- 受保护提示。

历史正文必须通过 `services/security/crypto.js` 生成受保护 payload 后保存。

当前 `dev-local-v1` / `dev-local-base64-placeholder` 只是本地开发占位方案。后端生产环境已经拒收开发占位 envelope：

```text
version = local-v1 | dev-local-v1
algorithm = local-base64-placeholder | dev-local-base64-placeholder
```

正式上线前必须替换为“用户侧可解密、服务端和管理员不可见明文”的 envelope。后端只保存 ciphertext、envelope 和 metadata。

## 7. 日志边界

允许记录：

- 文本长度。
- 操作类型。
- 状态。
- 脱敏命中类型和数量。
- 错误码。

禁止记录：

- 原始医疗正文。
- 未脱敏 OCR/ASR 文本。
- 未脱敏 AI 输入。
- 身份证、手机号、住院号等敏感字段。
- proofCode 明文或 `proofCodeHash`。

## 8. 后台边界

后台可以做：

- 导入激活码。
- 预置设备。
- 批量导入设备。
- 强制解绑设备。
- 查看反馈 metadata。
- 查看审计日志。

后台不得做：

- 查看用户历史正文明文。
- 导出用户正文。
- 查看 proofCode 明文。
- 查看 `proofCodeHash`。

## 9. Release Gate

每次交付前运行：

```bash
npm run release:check
```

如果该命令不通过，不进入人工试点。
