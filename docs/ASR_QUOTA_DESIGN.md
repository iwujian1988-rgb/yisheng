# ASR 每日额度系统 — 技术设计 + 交互设计

## Context

云端 ASR（qwen3-asr-flash）按秒计费，1 小时约 ¥2。需要控制成本，同时给会员用户合理的使用体验。

### 产品决策（已确认）

| 决策项 | 结论 |
|--------|------|
| 额度用完 | 立即停止录音，已转写文本保留 |
| 跨午夜归属 | 按启动录音时间归属当天 |
| 记录存储 | 文本存后端，音频只本地临时保留 |
| 非会员 | 不动，保持现有准入逻辑 |
| 转写失败 | 不扣额度 |
| 时区 | 统一北京时间（UTC+8） |

---

## 一、数据模型

### 1.1 `asrDailyUsage` — 每日额度消耗

```js
{
  id: 'adu_xxxx',
  userId: 'user_xxxx',
  date: '2026-06-12',        // 北京时间 YYYY-MM-DD
  secondsUsed: 0,             // 当日累计使用秒数
  sessionDate: '2026-06-12',  // 当前录音 session 归属日期（跨午夜保护）
  updatedAt: '2026-06-12T...'
}
```

### 1.2 `asrRecords` — 转写记录

```js
{
  id: 'asr_xxxx',
  userId: 'user_xxxx',
  text: '转写文本内容',
  durationMs: 45000,          // 录音时长
  segmentCount: 6,            // 分段数
  source: 'asr',              // 'asr' | 'ai'
  createdAt: '2026-06-12T...'
}
```

---

## 二、后端改动

### 2.1 `backend/src/config.js` — 新增配置

```js
asrDailyQuotaSeconds: Number(process.env.ASR_DAILY_QUOTA_SECONDS || 3600),
```

### 2.2 `backend/src/store/create-store.js` — 注册新集合

`ensureCollections` 数组添加 `'asrDailyUsage'` 和 `'asrRecords'`。

### 2.3 `backend/src/modules/user-api.js` — 新增 4 个接口

#### `GET /api/asr/quota`

```
Response: {
  usedMs: 1800000,
  totalMs: 3600000,
  remainingMs: 1800000,
  date: '2026-06-12',
  canUse: true
}
```

逻辑：
1. 取北京时间日期 `beijingDate`
2. 查 `asrDailyUsage` 找 `userId + date` 匹配记录
3. 不存在或日期不同 → 初始化为 0
4. 返回剩余额度

#### `POST /api/asr/records` — 保存 ASR 记录

```
Body: { text, durationMs, segmentCount, source }
```

#### `GET /api/asr/records` — 查询用户转写记录列表

```
Response: {
  records: [{ id, text, durationMs, segmentCount, source, createdAt }],
  total: 15
}
```

#### `DELETE /api/asr/records/:id` — 删除单条记录

### 2.4 `backend/src/modules/provider-gateway.js` — 改造 asrTranscribe

在现有 auth + deviceSession 校验之后、实际调 AI 之前插入：

```
asrTranscribe(req, res):
  1. auth.requireUser
  2. parseBody
  3. deviceSession.resolveDeviceSession
  4. 校验 audioBase64
  5. 【新增】checkAsrQuota(actor.id) → 不足则 429
  6. 调 callCloudAsr / callJsonWorker
  7. 【新增】成功后 deductAsrQuota(actor.id, segmentDurationMs)
  8. 返回结果
```

关键细节：
- **segmentDurationMs**：前端在 body 中传 `durationMs`，后端信任但 clamp 到 `[1, 30000]`（单段最长 30s）
- **失败不扣**：只在 API 返回成功后才 `deductAsrQuota`
- **跨午夜**：按第一次请求时的北京日期归属，后续同一 session 内即使跨了 00:00 也用同一个日期

### 2.5 北京时间工具函数

在 `backend/src/security/ids.js` 新增：

```js
function beijingDateStr() {
  var now = new Date();
  var utc = now.getTime() + now.getTimezoneOffset() * 60000;
  var bj = new Date(utc + 8 * 3600000);
  return bj.toISOString().slice(0, 10);
}
```

### 2.6 `backend/src/server.js` — 注册新路由

```
router.get('/api/asr/quota', userApi.getAsrQuota);
router.post('/api/asr/records', userApi.saveAsrRecord);
router.get('/api/asr/records', userApi.listAsrRecords);
router.delete('/api/asr/records/:id', userApi.deleteAsrRecord);
```

---

## 三、前端改动

### 3.1 `services/api/endpoints.js` — 新增端点

```js
asr: {
  transcribe: '/api/asr/transcribe',
  quota: '/api/asr/quota',
  records: '/api/asr/records'
}
```

### 3.2 `services/asr/quota.js` — 新建额度服务

```js
module.exports = {
  getQuota(),       // GET /api/asr/quota → { usedMs, totalMs, remainingMs, canUse }
  saveRecord(body), // POST /api/asr/records
  listRecords()     // GET /api/asr/records
}
```

### 3.3 `pages/asr/index.js` — 核心改造

**新增 data：**

```js
quotaInfo: { usedMs: 0, totalMs: 3600000, remainingMs: 3600000, canUse: true },
quotaCountdownText: '60:00',
showSaveDialog: false
```

**新增逻辑：**

| 时机 | 动作 |
|------|------|
| `onLoad` | 调 `quotaService.getQuota()`，初始化额度信息 |
| `toggleRecord`（开始前） | 检查 `remainingMs > 0`，不足则 toast 提示 |
| 录音中定时器 | 实时倒计时 `quotaCountdownText`，颜色渐变 |
| 额度耗尽 | 自动触发 `stopRecord()`，toast "今日额度已用完" |
| `transcribeAudio` 回调 | 估算段时长，更新本地剩余倒计时 |
| 离开页面（有内容） | 弹保存弹窗：保存 / 放弃 / 取消 |
| 保存 | 调 `quotaService.saveRecord()` → 清除草稿 → 返回 |
| 放弃 | 清除草稿 → 返回 |

**onUnload / onHide 改造：**
- 当前直接 `persistDraft('unload')`
- 改为：如果有内容且未保存，先 persistDraft 再启用原生 alert 兜底
- `onUnload` 无法弹自定义 UI，用 `wx.enableAlertBeforeUnload` 原生弹窗兜底

**返回按钮拦截：**
- ASR 页面自定义 navigationBar
- 点返回 → 有内容则弹自定义保存弹窗，无内容直接返回

### 3.4 `pages/asr/index.wxml` — UI 改造

```
┌─────────────────────────────────┐
│  ← 语音转文字        今日剩余 42:15 │  ← 顶栏：标题 + 倒计时
├─────────────────────────────────┤
│                                 │
│        ┌──────────┐             │
│        │   录音    │             │  ← 录音按钮（状态不变）
│        └──────────┘             │
│     正在录音 03:21               │  ← 录音时长
│     请保持小程序在前台            │
│                                 │
├─────────────────────────────────┤
│  转写结果           已转写 6 段   │
│ ┌─────────────────────────────┐ │
│ │ 转写文本内容...              │ │  ← 可编辑区域
│ │                             │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ [重试转写]  [专业整理]  [使用这段] │  ← 底部操作栏
└─────────────────────────────────┘

         ↓ 点击返回时 ↓

┌─────────────────────────────────┐
│                                 │
│   是否保存转写记录？              │
│                                 │
│   保存：文本存入"我的转写记录"     │
│   放弃：清除当前内容              │
│                                 │
│  [放弃]  [取消]  [保存到记录]     │
│                                 │
└─────────────────────────────────┘
```

**额度倒计时样式：**

| 剩余量 | 颜色 | 色值 |
|--------|------|------|
| > 5 min | 蓝色 | `#1677FF` |
| 1-5 min | 橙色 | `#FF8800` |
| < 1 min | 红色 | `#E5484D` |
| 0 | 灰色 + "今日额度已用完" | `#999` |

### 3.5 `pages/ai/detail.js` — AI 页语音按钮改造

`goVoice()` 函数：在导航到 ASR 页之前，调 `quotaService.getQuota()`，toast 显示 "今日剩余 XX 分钟"，然后正常跳转。

### 3.6 `pages/asr/index.wxss` — 新增样式

- `.quota-bar`：顶栏右侧倒计时
- `.quota-warning`：橙色
- `.quota-danger`：红色
- `.save-dialog`：保存弹窗蒙版 + 弹窗卡片

---

## 四、交互设计评审

### 4.1 核心交互流程

```
用户进入 ASR 页
  │
  ├─ 显示今日剩余额度（顶栏倒计时）
  │
  ├─ 点录音 → 检查额度
  │    ├─ 无额度 → toast "今日额度已用完，明天 0:00 恢复"
  │    └─ 有额度 → 开始录音 + 实时倒计时
  │         │
  │         ├─ 每段转写成功 → 扣额度 → 更新倒计时
  │         ├─ 转写失败 → 不扣额度 → toast 错误
  │         ├─ 额度耗尽 → 自动停止 → toast "额度用完，已保存草稿"
  │         └─ 用户手动停 → 停止录音
  │
  ├─ 编辑转写文本
  │
  ├─ 点"使用这段" → 存 draft → 跳转 editor
  │
  └─ 点返回 → 有未保存内容？
       ├─ 无内容 → 直接返回
       └─ 有内容 → 弹窗：保存 / 放弃 / 取消
            ├─ 保存 → POST /api/asr/records → 返回
            ├─ 放弃 → 清除草稿 → 返回
            └─ 取消 → 留在页面
```

### 4.2 交互决策表

| 场景 | 设计 | 理由 |
|------|------|------|
| 额度展示位置 | 顶栏右侧，常驻可见 | 录音时需实时感知剩余量 |
| 额度颜色变化 | 蓝→橙→红三段渐进 | 不打断录音，视觉自然过渡 |
| 额度耗尽处理 | 自动停录 + toast + 保留文本 | 不能白录，保留已有成果 |
| 跨午夜保护 | 不中断，归属起始日期 | 体验优先，成本差异可忽略 |
| 保存弹窗时机 | 点返回/离开时 | 不干扰录音和编辑流程 |
| AI 模块语音 | 跳转前 toast 显示剩余 | 让用户提前知道额度状况 |
| 失败不扣额度 | 后端只在成功后扣 | 保护用户权益 |

### 4.3 边界情况处理

| 边界 | 处理 |
|------|------|
| **onUnload 无法弹自定义 UI** | `onShow` 时启用 `wx.enableAlertBeforeUnload` 原生弹窗兜底；自定义返回按钮拦截走自定义弹窗 |
| **录音中额度更新延迟** | 前端本地计时器预估（每段 +8s），后端精确扣。前端倒计时略超前是安全的 |
| **从 AI 跳转来的 ASR** | `returnToAi=true` 时"使用这段"变"填入 AI"，离开保存弹窗仍出现 |
| **杀进程/切微信** | 已有 recoverable draft 机制兜底，下次进入可恢复 |
| **剩余不够一段（<8s）** | 只要 >0 就允许开始最后一段，后端按实际时长扣 |
| **并发多段转写** | 后端 `secondsUsed` 按实际转写返回顺序累加，不锁，误差在秒级可接受 |

### 4.4 后续优化项（本次不做）

1. ASR 页"专业整理"按钮筛选为 ASR 场景子集（口语转书面、自由模式、查漏补缺、要点提取）
2. 新增"护理记录" quick action preset
3. 转写记录列表页（需要新建 `pages/asr/records` 页面）
4. 管理后台 ASR 用量统计面板

---

## 五、文件变更清单

| # | 文件 | 改动 |
|---|------|------|
| 1 | `backend/src/config.js` | 新增 `asrDailyQuotaSeconds` |
| 2 | `backend/src/store/create-store.js` | 注册 `asrDailyUsage`, `asrRecords` |
| 3 | `backend/src/security/ids.js` | 新增 `beijingDateStr()` |
| 4 | `backend/src/modules/user-api.js` | 新增 4 个接口：额度查询 + 记录 CRUD |
| 5 | `backend/src/modules/provider-gateway.js` | `asrTranscribe` 插入额度检查和扣减 |
| 6 | `backend/src/server.js` | 注册 4 个新路由 |
| 7 | `services/api/endpoints.js` | 新增 `asr.quota`, `asr.records` |
| 8 | `services/asr/quota.js` | **新建**：额度 + 记录 API 服务 |
| 9 | `pages/asr/index.js` | 额度加载/倒计时/保存弹窗/离开拦截 |
| 10 | `pages/asr/index.wxml` | 额度倒计时 UI + 保存弹窗 |
| 11 | `pages/asr/index.wxss` | 额度样式 + 弹窗样式 |
| 12 | `pages/ai/detail.js` | `goVoice` 前 toast 显示剩余额度 |

---

## 六、验证方式

1. `node --check` 验证所有改动文件语法
2. 后端启动 → `GET /api/asr/quota` 返回初始额度 3600000ms
3. 发送 ASR 转写 → 成功后再次 GET quota 确认扣除
4. 连续转写直到超额度 → 返回 429 QUOTA_EXCEEDED
5. 跨午夜测试：手动修改 date 判断逻辑模拟跨日
6. 前端：录音中观察倒计时颜色变化，额度耗尽时自动停止
7. 前端：有内容时点返回 → 弹保存弹窗 → 保存/放弃
8. AI 页点语音 → toast 显示剩余 → 跳转 ASR
