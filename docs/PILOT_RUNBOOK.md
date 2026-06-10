# 试点运行手册

> 日期：2026-06-08  
> 目标：用最短路径验证“开通服务 -> 绑定设备 -> OCR/ASR/手动输入 -> 发送到电脑”的闭环。

## 1. 一键交付前检查

每次交付前优先运行：

```bash
cd repo
npm run release:check
```

通过标志：

```text
RELEASE_CHECK_OK
```

该命令已覆盖：

- 后台管理页 JS 语法。
- 小程序关键服务和关键页面语法。
- 主后端 smoke。
- 管理员开通、激活码、设备预置、proofCode 校验、用户态刷新 smoke。
- OCR worker smoke。
- 小程序 152 个注册页面路由存在性。
- 生产环境禁止默认 file store。
- 后台 `/admin` 资产可访问。

## 2. 后端启动前检查

推荐生产/试点环境变量：

```bash
NODE_ENV=production
STORE_MODE=mysql
ALLOW_UNKNOWN_DEVICE_BINDING=false
WECHAT_APP_ID=...
WECHAT_APP_SECRET=...
OCR_WORKER_URL=http://127.0.0.1:9001/recognize
ASR_WORKER_URL=http://127.0.0.1:9002/transcribe
```

强制边界：

- `NODE_ENV=production` 且 `STORE_MODE=file` 时，后端默认拒绝启动。
- 只有受控临时试点才允许 `ALLOW_FILE_STORE_IN_PRODUCTION=true`。
- 生产默认不允许未知设备绑定，设备必须先在后台预置。
- `proofCode` 只保存哈希，前台/后台响应不得出现 `proofCodeHash`。

## 3. 管理员试点流程

1. 登录 `/admin`。
2. 导入激活码。
3. 单台预置设备：`POST /api/admin/devices`。
4. 批量预置设备：后台设备页粘贴 CSV，或调用 `POST /api/admin/devices/import`。
5. 用户激活服务后，用同一序列号和 proofCode 绑定。
6. 后台设备列表只应显示 `hasProofCode`，不显示 proofCode 明文或哈希。

CSV 模板：

```csv
serialNo,templateAccess,proofCode,model
PRO-PILOT-001,professional,2468,TXT-HID
PRO-PILOT-002,professional,1357,TXT-HID
```

导入规则：

- 单次最多 500 台。
- 重复 `serialNo` 会更新设备资料。
- 坏行不会阻断整批导入，会返回 `errors` 明细。

## 4. 小程序现场检查

必跑页面：

- 登录页。
- 激活码页。
- 设备绑定页。
- 设备管理页。
- 首页发送页。
- OCR 选择和确认页。
- ASR 录音和确认页。
- 后端检查页或网络测试页。
- 3000 字长文本压测页。

后端检查页应能显示：

- 后端地址是否配置。
- `/api/health` 是否可达。
- 存储模式。
- 未知设备绑定策略。
- OCR/ASR/AI provider 是否配置。
- 登录 token 是否存在。

## 5. OCR 闸门

先跑 3-5 张小样本，再跑 50 张稳定性样本。

通过标准：

- 图片能上传到 gateway。
- worker 返回 `text`，失败时错误提示清晰。
- 小程序进入 OCR 确认页。
- 用户可编辑识别结果。
- 确认后能回到首页草稿。

廉价 AI 可负责：

- 按 `docs/ocr-gate-test-materials.md` 制作图片和人工标注。
- 记录识别文本、明显错字、是否可接受。
- 不负责上线判断，由 Codex/人工 reviewer 判定。

## 6. 3000 字硬件压测

测试条件：

- 目标电脑使用医院/客户真实输入环境。
- 小程序保持前台，设备保持连接。
- 文本长度约 3000 字。
- 目标 120 秒内完成。

记录字段：

| 字段 | 示例 |
|---|---|
| 设备序列号 | `PRO-PILOT-001` |
| 电脑系统 | Windows 10/11 |
| 输入法 | 微软拼音/搜狗/医院系统输入法 |
| 是否通过 | 是/否 |
| 耗时 | 98s |
| 失败阶段 | 蓝牙/焦点/输入法/权限/硬件 |
| 备注 | 是否乱序、丢字、卡顿 |

## 7. 试点阻断条件

任一命中即暂停发布：

- `npm run release:check` 不通过。
- 生产仍依赖未备份 file store。
- `proofCodeHash` 出现在任意前端或后台响应里。
- OCR/ASR/AI 结果绕过确认页直接发送。
- 历史记录或日志保存用户明文。
- 3000 字真实电脑压测无法稳定完成。
