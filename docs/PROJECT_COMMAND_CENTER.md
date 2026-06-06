# Project Command Center

## Current Status

小程序 MVP 已进入“页面基本铺完、核心服务开始接入、真实后端与硬件压测待落地”的阶段。

- 页面 UI：约 95%+，低成本 AI 已补齐大量低风险页面。
- 页面路由：已注册到 B-150 存在页面。
- 首页蓝牙/VUC 发送链路：已做保护性封装，原调通逻辑不重写。
- 账号/付费/设备绑定：本地测试服务已具备；核心服务已按后端 API contract 预留真实接口分支。
- 管理员后台：本地服务骨架已具备；付费用户和激活码服务已预留真实后端分支，真实权限待接入。
- AI：脱敏、集中 prompt、开发 provider、后端 AI gateway 分支、审核后发送草稿链路已接入。
- OCR/ASR：页面已从 toast 占位推进到服务层调用；已具备后端 upload gateway 分支，真实 provider 尚未配置。
- 医疗数据安全：脱敏边界、受保护历史记录 payload、本地加密占位已具备；历史记录已支持真实后端 ciphertext/envelope 分支，真实用户侧可解密方案待落地。
- QA/验收：冒烟、发布检查、隐私检查、长文本压测页面已具备；长文本压测已能生成 3000 字非医疗草稿并进入首页发送链路。
- 数据看板：财务服务、用户指标、设备指标、传输指标已接入本地数据源。

## Local Test Accounts

当前可直接本地测试账号体系，不需要真实后端：

- 可用医生：`13800000001` / `Test123456`
- 未购买医生：`13800000002` / `Test123456`
- 已购买未绑定医生：`13800000003` / `Test123456`
- 注册验证码：`123456`
- 测试激活码：`ACTIVE123456`

本地状态链路：

1. 新注册用户默认进入“服务未开通”。
2. 输入测试激活码后进入“已购买未绑定”。
3. 绑定任意非空设备序列号和校验码后进入 `active`。
4. `active` 用户才允许进入首页核心传输功能。

## Active Workstreams

### Codex

当前负责：

- 架构设计与核心服务封装。
- 蓝牙/VUC 保护。
- 账号/付费/设备绑定本地服务。
- 管理员、OPS、QA 本地服务。
- AI/OCR/ASR 服务边界。
- 脱敏、受保护历史记录、本地加密占位。
- Code Review。
- 路由注册。
- 本地测试链路接入。

下一优先级：

1. 继续接真实后端接口和微信登录/付费用户开通流程。
2. 准备 3000 字 2 分钟长文本硬件压测工具和记录服务。
3. 确定 DeepSeek V4、开源 OCR、ASR provider 接入顺序。
4. 落地“用户可见、管理员不可见明文”的真实加密存储方案。
5. 对 AI-B 最终 UI 做整体验收和必要修复。

### AI-B

当前执行：

- `docs/LOW_COST_AI_ALL_REMAINING_UI_TASK_POOL_PROMPT.md`
- 低风险 UI 页面和静态交互。

边界：

- 不修改 `app.json`。
- 不修改 `services/**`。
- 不修改 `utils/**`。
- 不碰首页蓝牙/VUC/发送逻辑。
- 不调用接口、蓝牙 API、AI/OCR/ASR。
- 不写页面级 mock、真实联系方式、价格、医疗正文或患者信息。

## Completed Capability Packs

- 蓝牙/VUC 保护性封装。
- 登录/注册/找回密码本地测试链路。
- 购买状态、激活码、设备绑定本地测试链路。
- 传输确认、本地队列、草稿箱、异常原因记录页面。
- AI 脱敏、集中 prompt、开发 provider、结果审核、发送到首页草稿。
- OCR/ASR 入口调用服务层，结果确认回填首页草稿。
- 历史记录受保护存储，列表不展示明文。
- 设备详情、解绑、固件信息页面。
- 传输设置、隐私设置、通知设置、本地数据管理页面。
- 管理员付费用户、设备、服务记录、反馈、审计日志骨架。
- 激活码批量导入、列表筛选、本地使用标记。
- QA 冒烟、发布检查、隐私检查、长文本压测、Bug 报告页面。
- 3000 字非医疗压测文本生成、压测记录创建、长文本检测、首页草稿发送链路。
- API client、auth session、purchase activation、device binding 已统一走 `services/api/endpoints.js` 合同。
- 管理员付费用户创建/更新、激活码导入/列表已支持本地测试和真实后端双分支。
- 历史记录保存已支持后端 ciphertext/envelope，列表只展示 metadata。
- 管理员审计日志、反馈、设备故障、QA bug report 已支持本地测试和真实后端双分支。
- AI/OCR/ASR 已统一为“本地未配置明确失败、真实环境走后端 gateway”的结构。
- OPS 现场部署、设备交付、售后工单页面。
- 用户操作手册目录和详情页面。
- 后端 API 契约初稿。
- 硬件 3000 字 2 分钟压测方案。

## Major Remaining Risks

- 真实后端尚未接入。
- 微信登录真实流程尚未接入。
- 管理员创建付费用户仍是本地测试服务。
- 管理员权限校验和审计日志仍是本地骨架。
- DeepSeek V4 尚未真实接入。
- OCR/ASR provider 选型和真实识别尚未落地。
- 加密存储尚未真正实现“用户可见、管理员不可见明文”。
- 3000 字 2 分钟传输验收尚未进行硬件真机压测。
- 医院电脑环境复杂，需要真实场景矩阵测试。

## Immediate Next

1. Codex 确定 OCR/ASR provider 方案并补后端实现计划。
2. Codex 落地用户内容加密存储和管理员不可见明文方案。
3. Codex 检查 AI-B 最终 UI，并统一修复明显编码和交互问题。

## Useful Docs

- `docs/LOW_COST_AI_ALL_REMAINING_UI_TASK_POOL_PROMPT.md`
- `docs/BACKEND_API_CONTRACTS.md`
- `docs/BACKEND_IMPLEMENTATION_TODO.md`
- `docs/HARDWARE_LONG_TEXT_TEST_PLAN.md`
- `docs/AUTH_PAYMENT_DEVICE_ARCHITECTURE.md`
- `docs/SECURITY_AI_DATA_BOUNDARY.md`
- `docs/AI_CORE_ARCHITECTURE.md`
- `docs/CODE_REVIEW_CHECKLIST.md`
