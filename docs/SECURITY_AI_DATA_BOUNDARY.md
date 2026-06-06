# 医疗文本安全与 AI 数据边界

## 1. 核心原则

医疗文本进入第三方 AI 前，必须先经过脱敏处理。任何日志、埋点、错误上报、测试数据和页面文案，都不得包含明文医疗正文、患者身份信息或仿真的患者样例。

当前核心模块：

```text
services/security/redaction.js
services/security/content-guard.js
services/security/crypto.js
services/ai/assistant.js
```

这些模块负责：
- 第三方 AI 调用前脱敏。
- 生成安全输入摘要。
- 阻止明文写入日志和列表页。
- 以受保护 payload 保存历史正文。

## 2. 当前脱敏范围

初版覆盖：
- 手机号。
- 身份证号。
- 病案号、住院号、门诊号、医保号、就诊卡号。
- 姓名、患者、病人等标签后的姓名字段。
- 地址、住址、家庭住址字段。

输入示意只描述字段类型，不写真实或仿真的个人信息：

```text
姓名字段、手机号字段、住院号字段
```

脱敏后进入 AI 的文本应呈现为：

```text
姓名：[姓名]，手机号：[手机号]，住院号：[编号]
```

## 3. AI 调用边界

AI 调用流程必须是：

```text
用户输入
-> services/security/content-guard.prepareTextForThirdPartyAi()
-> services/ai/prompts.js 选择集中管理的 prompt
-> services/ai/provider.js
-> 用户审核输出
-> 可选保存或发送到电脑
```

页面不得直接调用 DeepSeek，也不得直接拼接 prompt。页面只调用 `services/ai/assistant.js` 暴露的业务入口。

当前真实 DeepSeek provider 尚未配置。开发模式 provider 只返回安全摘要，不回显用户原文。

## 4. 存储边界

历史记录列表只展示：
- 来源类型。
- 文本长度。
- 发送状态。
- 创建时间。
- 受保护提示文案。

历史正文必须通过 `services/security/crypto.js` 生成受保护 payload 后保存。当前 `local-v1` 只是本地开发占位方案，不是最终加密承诺。

管理员视角不得展示用户医疗正文明文。后续真实后端需要实现用户侧可解密、管理员不可见明文的密钥管理方案。

## 5. 日志边界

日志允许记录：
- 文本长度。
- 操作类型。
- 状态。
- 脱敏命中类型和数量。
- 错误码。

日志禁止记录：
- 原始医疗正文。
- 未脱敏 OCR/ASR 文本。
- 未脱敏 AI 输入。
- 用户身份证、手机号、住院号等敏感字段。

## 6. OCR/ASR 边界

OCR/ASR 输出在进入 AI 或历史保存前，必须进入同一条脱敏与受保护存储链路：

```text
OCR/ASR 原始输出
-> content-guard 脱敏
-> AI 或用户确认
-> crypto 受保护保存
```

页面不得自行写识别结果测试文本。开发测试结果必须来自服务层或明确测试接口。

## 7. 后续待完成

- 服务端密钥管理方案。
- 用户侧可见、管理员不可见明文的真实加密方案。
- DeepSeek V4 真实 provider。
- 开源 OCR provider。
- ASR provider 选型和接入。
- 脱敏规则测试集。
- 管理员审计日志。
