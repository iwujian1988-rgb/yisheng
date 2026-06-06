# Code Review 记录

## 2026-06-02：AI-B 首批页面初审

范围：

- `pages/register/**`
- `pages/forgot-password/**`
- `pages/account-status/**`

结论：

- 未发现修改禁区文件。
- 未发现真实接口调用。
- 未发现 DeepSeek/OCR/ASR/脱敏/加密等越权实现。
- 3 个页面 JS 均通过 `node --check`。

需要返修：

1. `pages/register/register.js`

   验证码长度使用了 `code.length >= 4` 和 `< 4`，与 PRD 的 6 位验证码不一致。应改为 6 位数字。

2. `pages/forgot-password/forgot-password.js`

   同样使用了 4 位验证码判断。应改为 6 位数字。

3. `pages/account-status/account-status.js`

   Mock `expireDate` 为 `2025-12-31`，以当前日期 2026-06-02 看已经过期，容易造成页面语义混乱。应改为未来日期或去掉具体日期。

4. `pages/account-status/account-status.js`

   `goToBindDevice()` 跳转 `/pages/device/device`，但该页面当前尚不存在且 `app.json` 未注册。可以保留函数入口，但建议先用 toast 占位，等 Codex 统一接路由。

5. `pages/register/register.js`、`pages/forgot-password/forgot-password.js`

   注释里保留了 `app.request` 示例。虽然没有真实调用，但后续应统一改成“由 Codex 接入 services/auth/session.js”，避免其他 AI 误接旧接口。

返修要求：

- 只修改原任务允许的页面文件。
- 不修改 `app.json`。
- 不接真实接口。
- 不触碰 `services/**`、`utils/**`、`pages/home/home.js`。

处理结果：

- Codex 已接管需要进入核心架构的部分。
- `app.json` 路由由 Codex 统一接入。
- 注册/找回密码已改为调用 `services/auth/session.js`，测试数据来自 `services/dev/test-data.js`。
- 验证码规则已统一为 6 位数字。
- 账号状态页已接入 `services/constants/account-status.js`。

## 2026-06-02：AI-B 第二批页面初审

范围：

- `pages/device/**`
- `pages/history/**`
- `pages/settings/transfer.*`

结论：

- 未发现修改禁区文件。
- 未发现页面级 mock 数据。
- 未发现 `setTimeout` 假成功。
- 未发现真实接口调用。
- 未引用 `utils/ble/**` 或 `utils/encoder/**`。
- 3 个页面 JS 均通过 `node --check`。

Codex 接管处理：

- `pages/device/device.js` 已接入 `services/auth/session.js`，可读取当前测试 session 中的设备信息。
- `pages/history/history.js` 已接入 `services/history/records.js`，默认读取本地测试记录，初始为空数组。
- `pages/settings/transfer.js` 已接入 `services/settings/transfer-settings.js`，设置可保存到本地 storage。
- `app.json` 已由 Codex 统一注册设备、历史记录、传输设置页面路由。

保留事项：

- 设备绑定/解绑真实业务仍待 Codex 接入 `services/device/binding.js`。
- 历史记录写入将在发送链路完成后由 Codex 接入。
- 传输设置保存后暂不改变真实 BLE 发送参数，后续由 Codex 将设置映射到发送策略。

## 2026-06-02：AI-B 第三批页面初审

范围：

- `pages/profile/**`
- `pages/help/**`
- `pages/common/agreement.*`

结论：

- 未发现修改禁区文件。
- 未发现页面级 mock 数据。
- 未发现真实接口调用。
- 3 个页面 JS 均通过 `node --check`。

需要 Codex 接管的点：

- 协议页原文存在“不存储、不分析、不传输至云端”的绝对表述，与历史记录加密存储和 AI 脱敏调用边界不一致。

Codex 接管处理：

- `pages/profile/profile.js` 已接入 `services/auth/session.js`，可读取当前测试 session 的用户信息。
- 个人中心的账号状态、设备管理、传输设置、历史记录、帮助中心入口已接入真实路由。
- 退出登录已接入 `authSession.clearSession()`。
- 协议页文案已修正为“用户主动操作/授权后处理、历史记录加密存储、管理员不可见明文”的边界表述。
- `app.json` 已由 Codex 统一注册个人中心、帮助中心、协议页路由。

## 2026-06-02：AI-B 第四批进行中初查

范围：

- `pages/ai/index.*`
- `pages/templates/index.*`

结论：

- 文件已出现，说明 AI-B 已开始第四批。
- `pages/ai/index.js` 通过 `node --check`。
- `pages/templates/index.js` 通过 `node --check`。
- `pages/ocr/**`、`pages/asr/**` 尚未出现。

处理：

- 暂不接入第四批路由。
- 等 AI-B 完整交付 B-010/B-011/B-012/B-013 后统一审查。

## 2026-06-02：AI-B 第四批完整初审

范围：

- `pages/ai/index.*`
- `pages/templates/index.*`
- `pages/ocr/index.*`
- `pages/asr/index.*`

结论：

- 未发现修改禁区文件。
- 未发现页面级 mock 数据。
- 未发现真实接口调用。
- 未发现 AI prompt。
- 未调用 DeepSeek/OCR/ASR。
- 4 个页面 JS 均通过 `node --check`。

Codex 接管处理：

- `app.json` 已由 Codex 统一注册 AI、模板、OCR、ASR 页面路由。
- 新增 `services/ocr/recognizer.js`，当前返回 `OCR_NOT_CONFIGURED`。
- 新增 `services/asr/transcriber.js`，当前返回 `ASR_NOT_CONFIGURED`。
- 新增 `docs/OCR_ASR_ARCHITECTURE.md`。

保留事项：

- OCR 图片选择和上传流程待 Codex 接入。
- ASR 录音和转写流程待 Codex 接入。
- AI 页面与 `services/ai/assistant.js` 的真实交互待 Codex 接入。

## 2026-06-02：AI-B 第五批完整初审

范围：

- `pages/ai/detail.*`
- `pages/templates/result.*`
- `pages/ocr/result.*`
- `pages/asr/result.*`

结论：

- 未发现修改禁区文件。
- 未发现页面级 mock 数据。
- 未发现真实接口调用。
- 未发现 AI prompt。
- 未调用 DeepSeek/OCR/ASR。
- 4 个页面 JS 均通过 `node --check`。

Codex 接管处理：

- 新增 `services/content/draft.js`，用于跨页面待发送草稿。
- 首页 `pages/home/home.js` 已在 `onShow` 读取待发送草稿并填入输入框。
- 模板结果页、OCR 结果页、ASR 结果页的“确认/发送到电脑”已接入草稿服务。
- `app.json` 已由 Codex 统一注册第五批结果页路由。

保留事项：

- AI 对话详情页与 `services/ai/assistant.js` 的真实生成交互待接入。
- 模板结果页的重新生成和复制能力待接入。
- OCR/ASR 真实识别结果传入 result 页待接入。

Codex 追加处理：

- AI 对话详情页 `sendMessage()` 已接入 `services/ai/assistant.js`。
- AI 输入会先经过 `services/security/content-guard.js` 脱敏。
- 当前使用 service 层开发测试 provider，不调用真实 DeepSeek。

## 2026-06-02：AI-B 第六批完整初审

范围：

- `pages/purchase/index.*`
- `pages/device/bind.*`
- `pages/support/index.*`
- `pages/tutorials/index.*`

结论：

- 未发现修改禁区文件。
- 未发现页面级 mock 数据。
- 未发现真实接口调用。
- 未发现真实联系方式、价格或支付逻辑。
- 4 个页面 JS 均通过 `node --check`。

Codex 接管处理：

- `app.json` 已由 Codex 统一注册购买/开通、设备绑定、售后支持、教程列表页面。
- 新增 `services/purchase/activation.js`，提供开发测试激活码 `ACTIVE123456`。
- `pages/purchase/index.js` 已接入测试激活码服务。
- `services/device/binding.js` 已支持无后端时的测试绑定/解绑。
- `pages/device/bind.js` 已接入设备绑定服务。
- 新增 `services/tutorials/catalog.js`，当前返回空教程列表。
- `pages/tutorials/index.js` 已接入教程服务。

保留事项：

- 真实购买/开通后台接口待接入。
- 真实设备绑定接口待接入。
- 售后支持和教程数据源待接入。

## 2026-06-02：AI-B 第七批完整初审

范围：

- `pages/feedback/index.*`
- `pages/about/index.*`
- `pages/tutorials/detail.*`
- `pages/support/device-issue.*`

结论：

- 未发现修改禁区文件。
- 未发现页面级 mock 数据。
- 未发现真实接口调用。
- 未发现真实联系方式、二维码或敏感文本。
- 4 个页面 JS 均通过 `node --check`。

Codex 接管处理：

- `app.json` 已由 Codex 统一注册反馈、关于、教程详情、设备故障提交页面。
- 新增 `services/feedback/submissions.js`，反馈提交会保存为本地测试提交记录，只保存长度和状态摘要。
- 新增 `services/support/issues.js`，设备故障提交会保存为本地测试提交记录，只保存长度和状态摘要。
- `pages/feedback/index.js` 已接入反馈服务。
- `pages/support/device-issue.js` 已接入售后问题服务。
- `pages/about/index.js` 已接入帮助、用户协议、隐私政策路由。
- `pages/tutorials/detail.js` 已接入 `services/tutorials/catalog.js` 的详情入口。

保留事项：

- 真实反馈/售后后台接口待接入。
- 教程详情数据源待接入。

## 2026-06-02：AI-B 第八批完整初审

范围：

- `pages/network-test/index.*`
- `pages/tutorials/connect-guide.*`
- `pages/transfer/result.*`
- `pages/error/index.*`

结论：

- 未发现修改禁区文件。
- 未发现页面级 mock 数据。
- 未发现真实接口调用。
- 未调用蓝牙 API。
- 4 个页面 JS 均通过 `node --check`。

Codex 接管处理：

- `app.json` 已由 Codex 统一注册网络测试、连接教程、传输结果、通用错误页。
- 新增 `services/diagnostics/network-test.js`，当前返回待接入状态摘要，不调用蓝牙 API。
- `pages/network-test/index.js` 已接入诊断服务。
- `pages/tutorials/connect-guide.js` 已接入教程服务，并将 FAQ 入口接到帮助页。
- `pages/transfer/result.js` 已接入首页和历史记录路由。
- `pages/error/index.js` 主操作已接回首页。

保留事项：

- 真实蓝牙诊断服务待接入。
- 连接教程步骤数据源待接入。

## 2026-06-02：AI-B 第九批完整初审

范围：

- `pages/purchase/activate.*`
- `pages/purchase/records.*`
- `pages/device/detail.*`
- `pages/profile/edit.*`

结论：

- 未发现修改禁区文件。
- 未发现页面级 mock 数据。
- 未发现真实接口调用。
- 未发现真实价格、联系方式或敏感文本。
- 4 个页面 JS 均通过 `node --check`。

Codex 接管处理：

- `app.json` 已由 Codex 统一注册激活码、购买记录、设备详情、个人资料页面。
- 新增 `services/purchase/records.js`，服务记录保存到本地测试记录。
- 新增 `services/profile/account.js`，个人资料保存到本地测试用户信息。
- `services/purchase/activation.js` 已在测试激活成功后写入服务记录。
- `pages/purchase/activate.js` 已接入激活服务。
- `pages/purchase/records.js` 已接入服务记录读取。
- `pages/device/detail.js` 已接入 session 设备信息和解绑服务。
- `pages/profile/edit.js` 已接入个人资料读取和保存服务。

保留事项：

- 真实激活/服务记录后台接口待接入。
- 真实设备详情和解绑接口待接入。
- 真实个人资料保存接口待接入。
