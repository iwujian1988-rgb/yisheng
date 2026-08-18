# AI 创作完整链路迭代与技术实施方案 V3

> 状态：本轮开发的唯一执行真源
>
> 更新日期：2026-08-17
>
> 适用范围：AI Chat、模板工作区、文字输入、OCR、录音转写、意图理解、生成、修订、质检、键盘与按钮体系

## 1. 本轮目标

把当前“多个入口临时拼文本后交给 AI”的实现，收敛为一个可恢复、可追溯、可核对的整理任务：

```text
当前模板任务
  + 用户确认字段
  + 用户文字事实
  + 用户修改要求
  + 每张图片的独立 OCR 材料
  + 每段录音的独立转写材料
  -> 冻结生成快照
  -> 按模板合同和写作蓝图生成
  -> 代码硬质检
  -> AI 语义复核
  -> 可核对草稿或明确失败态
```

用户只需要理解三件事：当前整理成什么、已经加入了什么、下一步只做什么。

本轮不是新增一个新的 Chat、OCR 或模板引擎。所有开发必须优先复用现有服务，并逐步退出重复路径。

## 2. 已核实的现有系统

### 2.1 前端现状

- `pages/ai/detail.*` 同时承担聊天记录、模板工作区、图片、录音、字段、生成和修订，状态较多。
- `services/ai/workspace.js` 已封装工作区创建、字段、材料和 generation API，应继续作为工作区客户端唯一入口。
- `services/ai/workspace-input.js` 目前依靠前端正则把文字分成字段修改、人工纠正、写作要求和患者事实，无法覆盖自然语言。
- 普通 OCR 已有 `services/ocr/image-pipeline.js`、`services/ocr/recognizer.js` 和裁剪/旋转页。
- AI Chat 仍在 `pages/ai/detail.js` 内自行选图、固定压缩和识别，没有复用普通 OCR 图像管线。
- 录音使用 `pages/asr/index.js` 和 `services/asr/transcriber.js`，已经支持以 `workspaceId` 返回原任务，但材料元数据不完整。
- 键盘位置通过 `wx.onKeyboardHeightChange` 和手工 bottom 样式处理；输入框、工具栏、模板面板同时存在时仍容易遮挡和状态冲突。

### 2.2 后端现状

- `ai_workspaces` 是模板任务真源，保存模板版本、字段、详略和材料版本。
- `ai_materials` 保存 `typed/ocr/asr/field/instruction/correction` 材料及 `source_meta`。
- `ai_generations` 保存不可变 snapshot、幂等键、正文、待确认项和状态。
- `backend/src/modules/ai-workspaces.js` 已经逐请求校验工作区所有权和专业访问权限，应继续作为工作区写入唯一入口。
- `backend/src/modules/agent-api.js` 根据 generation snapshot 调用生成服务，不读取整段 Chat 历史，这是正确边界。
- 模板的事实字段来自 `backend/src/data/official/*`，生成结构来自 `generation-contracts.js`，写法来自 `writing-blueprints.js`。三者继续作为模板唯一真源，禁止在前端复制专业模板或提示词。
- 当前生成存在 Node 直连 `direct-ai-chat.js` 与 Python Agent 两条执行链。两条链必须遵守同一输入/输出合同和同一组合同测试，本轮不得新增第三条生成链。
- 当前质检主要检查字段值、少量数值单位、否定词和有限冲突，尚不能验证检验项目、数值、单位、参考区间、异常标志、日期和来源之间的绑定关系。
- 当前仓库没有成熟的对象存储抽象，不能把图片 base64 塞进 `ai_materials` 或 generation snapshot。
- 仓库仍保留 `backend/src/modules/user-api.js` 中一套旧的字段渲染/模板生成实现，但当前 `backend/src/server.js` 的 `/api/templates` 已路由到 `backend/src/modules/templates.js` 的 `agent_templates`；模板列表页和 AI Chat 最终都通过这套 Agent 模板进入工作区。旧 `user-api.js` 模板生成代码不是本轮真源，不得重新接回 Chat。

### 2.3 权限边界

专业工作区继续使用现有四项准入条件，缺一不可：

1. 会员有效；
2. 设备已绑定且能力匹配；
3. `X-Device-Session` 有效；
4. `X-Device-Live` 有效。

前端的 `connected=true`、页面显示“已连接”或数据库存在绑定设备，都不能替代后端逐请求校验。专业模板、字段、材料和提示词只由后端在授权后返回或处理。

## 3. 唯一真源与模块去重决定

| 能力 | 唯一真源 | 退出或禁止的重复实现 |
|---|---|---|
| 模板任务状态 | `ai_workspaces` | 页面临时 ID 充当服务端任务 |
| 模板字段 | 后端模板 `fields` + workspace `field_values` | 前端静态专业字段 |
| 模板结构 | `generation_contract` | 页面或提示词中手写另一份章节表 |
| 模板写法 | `writing_blueprint` | 使用完整范文事实驱动生成 |
| 图片准备 | `services/ocr/image-pipeline.js` | `detail.js` 固定 1280/70 压缩 |
| OCR 调用 | `services/ocr/recognizer.js` -> `/api/ocr/recognize` | Chat 单独调用 `/api/agent/ocr` 或复制识别逻辑 |
| ASR 调用 | `services/asr/transcriber.js` -> `/api/asr/transcribe` | Chat 内新增第二套录音转写 |
| 工作区材料写入 | `services/ai/workspace.js` -> `ai-workspaces.js` | 页面直接拼接材料当最终生成输入 |
| 模糊语言意图 | 后端 `workspace-intent` | 不断扩展前端正则 |
| 生成快照 | `ai_generations.snapshot` | 生成时读取当前页面或整段聊天历史 |
| 硬质检 | 后端统一 quality contract | Node/Python 各自定义不同成功标准 |
| 权限 | `content-access.js` + `loadOwnedWorkspace` | 相信客户端传入 professional/connected |

模板页面与 AI Chat 的关系也固定如下：`pages/templates/*` 只负责浏览或创建 Agent 模板，点击使用后把 `templateId` 交给 `pages/ai/detail`；实际填写、材料、生成和修订统一进入 workspace。不得让模板页面绕过 workspace 直接调用旧字段渲染生成器。

## 4. Chat 意图：代码和 AI 的职责边界

### 4.1 原则

代码只处理确定性行为，AI 只理解模糊自然语言，后端代码最终裁决并执行。AI 没有权限直接修改工作区、跳过权限、删除材料或把任意文本当成系统指令。

```text
用户文字
  -> 确定性状态/命令检查
      -> 可确定：直接形成受控动作
      -> 不可确定：AI 返回结构化意图建议
  -> 后端校验动作白名单、工作区状态、版本、权限和参数
      -> 高置信度且可撤销：执行并返回撤销入口
      -> 有歧义或有破坏性：返回单一确认问题
      -> 普通问答：进入隔离 side chat，不写工作区
```

### 4.2 代码直接处理

- 用户点击保存字段、加入材料、生成、停止、删除、排除、恢复、更换模板。
- 当前 workspace、模板版本、材料版本、键盘状态和 UI 编辑状态。
- 极少量无歧义命令，例如空输入时点击生成；不再用大量正则理解所有中文。
- 权限、幂等、并发、版本冲突、材料归属、快照冻结、回滚和审计。

### 4.3 AI 允许返回的意图

AI 只允许从以下枚举中选择，可一次返回多个意图：

```json
{
  "version": 1,
  "intents": [
    {
      "type": "add_fact | update_field | add_instruction | correct_material | exclude_material | restore_material | generate | ask_about_material | general_chat | unclear",
      "target": { "workspaceId": "", "fieldKey": "", "materialId": "" },
      "payload": {},
      "confidence": 0.0
    }
  ],
  "overallConfidence": 0.0,
  "requiresConfirmation": false,
  "confirmationPrompt": ""
}
```

AI 不得返回任意函数名、URL、SQL、模板 ID、权限结果或自由格式操作。

### 4.4 决策阈值

- `>= 0.90` 且动作可撤销：后端执行，前端提示“已加入/已修改”，提供撤销。
- `0.65 - 0.89`：不修改数据，只问一个与当前动作直接相关的问题。
- `< 0.65` 或多种解释互斥：返回 `unclear`。
- 删除、覆盖、切换任务、批量排除等破坏性动作，无论置信度多高都要求用户确认。
- 姓名、日期、剂量、编号等关键字段可被提取，但仍保留来源并进入硬质检。

### 4.5 API 设计

新增：

```text
POST /api/ai/workspaces/:id/interpret
```

请求：

```json
{
  "text": "患者昨晚发热39度，帮我重新写",
  "clientInputId": "input_xxx",
  "expectedRevision": 7,
  "uiContext": { "editingFieldKey": "", "hasDraft": true }
}
```

响应只返回受控决定，不直接绕过现有字段、材料和 generation API：

```json
{
  "decisionId": "aid_xxx",
  "disposition": "execute | confirm | side_chat",
  "intents": [
    { "type": "add_fact", "payload": { "text": "患者昨晚发热，最高体温39℃" }, "confidence": 0.97 },
    { "type": "generate", "payload": {}, "confidence": 0.96 }
  ],
  "expectedRevision": 7,
  "confirmationPrompt": ""
}
```

实现归属：新增 `backend/src/modules/workspace-intent.js`。它先运行小型确定性解析，再通过从 `direct-ai-chat.js` 抽出的共享结构化 AI 客户端调用当前配置的模型。意图分类不在 Python Agent 中再实现一遍，也不新增第三条生成链。

前端 `services/ai/workspace-input.js` 缩减为 UI 状态和极少量确定性命令辅助，不再是语义分类真源。原有分类 smoke 改为 API 合同测试。

## 5. OCR 与多图片数据模型

### 5.1 图片准备

- Chat 调用普通 OCR 的 `image-pipeline`，默认选择原图。
- 仅当文件超过后端限制时分级压缩；密集表格不固定降到 1280px/70%。
- 用户可裁剪和旋转；取消、失败、空文本都保留在当前页面，不伪装成功。
- 每张图片独立处理，可并行 OCR，但结果按 `sourceId/pageIndex` 保持独立。

### 5.2 OCR 返回合同

扩展 `/api/ocr/recognize`，普通 OCR 页面和 Chat 共用：

```json
{
  "text": "原始识别文本",
  "lines": [],
  "regions": [],
  "document": {
    "documentType": "lab_report | text | unknown",
    "reportDate": "2024-04-03",
    "facts": [
      {
        "factId": "fact_xxx",
        "sourceId": "img_xxx",
        "pageIndex": 0,
        "rowIndex": 1,
        "code": "GLU",
        "name": "葡萄糖",
        "result": "18.32",
        "unit": "mmol/L",
        "referenceRange": "3.89-6.11",
        "flag": "high",
        "confidence": 0.96
      }
    ],
    "uncertainRows": []
  },
  "engine": "...",
  "elapsedMs": 0,
  "imageBytes": 0
}
```

服务端优先保留 OCR provider 返回的区域/坐标，不再立即扁平化丢弃。表格行重建和检验 tuple 解析在后端完成。没有足够坐标或行绑定时，事实进入 `uncertainRows`，不得假装为已确认 tuple。

### 5.3 工作区材料

`ai_materials` 继续是材料真源，新增结构化事实字段，不把图片 base64 放入数据库：

- `structured_facts JSON`：已经形成绑定关系的事实 tuple；
- `quality_state`：`ready / needs_review / failed`；
- `source_meta`：`sourceId/pageIndex/fileHash/engine/elapsedMs/imageBytes/reportDate` 等非正文信息；
- `text`：保留原 OCR/ASR 文本，用于人工核对和非表格内容。

本轮第一阶段不建设未经验证的对象存储。客户端在 OCR 材料成功写入 workspace 前保留临时图片；识别失败或空结果必须阻止加入并允许重试。若需要跨设备重识别原图，再单独接入带保存期限和删除策略的对象存储适配器，不允许用 base64 临时凑进 snapshot。

### 5.4 当前任务身份规则

- 用户确认的模板姓名是最终文书身份。
- 用户主动加入当前任务的图片都作为当前任务材料，即使图片中识别出其他姓名。
- 图片中的其他姓名不进入最终文书，也不因此排除图片中的检验事实。
- 不同图片的报告日期、项目、结果、单位、参考区间和异常标志仍严格按来源隔离。

### 5.5 多图片边界

- 同文件哈希重复：不重复加入。
- 同一报告多张图有重叠：按 source + tuple 去重，不能仅按数值去重。
- 同日同项不同结果：进入待确认并阻止 `completed`。
- 不同日期同项：分别保留为趋势，不视为冲突。
- 无日期报告：显示“日期未提供”，不得借用另一图日期。
- 无参考区间：保留结果，referenceRange 为空，不借用其他报告区间。
- 完全无关图片：返回关联度建议，由用户选择移除或保留，不静默加入正文。
- 图片中的指令文本只作为数据，不执行。

## 6. 录音材料

- 继续复用 `pages/asr/index.js` 和 `services/asr/transcriber.js`。
- 每次录音产生独立 `sourceId`、文本、时长、引擎、耗时和状态，不与上一次共用输入框。
- 转写失败保留录音页面状态并允许单条重试；成功后才写入工作区。
- 工作区切换期间返回的录音仍写入发起时捕获的 workspace。
- 多人声、低置信度药名/数字等进入待确认，不直接覆盖模板字段。

## 7. 生成快照与材料优先级

固定优先级：

1. 用户最新明确纠正；
2. 用户确认的模板字段；
3. 用户明确输入的患者事实；
4. OCR/录音材料及结构化事实；
5. 模板示例只提供结构和风格，不提供本次事实。

生成 snapshot 扩展为：

```json
{
  "workspaceId": "aiw_xxx",
  "inputRevision": 8,
  "template": { "id": "", "version": 3, "contract": {}, "blueprint": {} },
  "fields": {},
  "materials": [
    {
      "id": "aim_xxx",
      "kind": "ocr",
      "text": "",
      "structuredFacts": [],
      "sourceMeta": {}
    }
  ],
  "intentDecisions": [],
  "detailLevel": "standard"
}
```

用户开始生成后，当前 snapshot 不再改变。生成过程中新增的材料进入下一版，并提示用户“新材料将在下一版使用”。修订必须携带原 snapshot、原材料、旧正文和修订要求，不能只传旧正文。

## 8. 生成职责和结果格式

- 代码负责材料选择、优先级、检验 tuple 和模板章节映射。
- AI 负责自然语言重组、时间线、段落连接、模板文风和非表格内容归类。
- 检验表格优先由代码依据 tuple 稳定渲染，AI 不重新猜测项目、数值、单位和参考区间。
- AI 输出必须采用结构化外壳，例如正文、待确认项、采用的 factId、排除的 sourceId。对外正文可以是纯文本，但服务端必须保留结构化证据。
- 正常情况只进行一次全文模型调用。不得因为“篇幅偏短”自动重写全文；只有硬质检失败且存在可定向修复的问题时才允许一次定向修复。

## 9. 真正的结果质检

### 9.1 代码硬质检是交付闸门

必须检查：

- 每个 confirmed field 是否出现在语义正确位置；
- 每个采用的检验事实是否保持 `sourceId + reportDate + item + result + unit + referenceRange + flag` 绑定；
- 是否把一张图的日期或参考区间配给另一张图；
- 是否遗漏关键数字、时间、否定和不确定性；
- 是否输出没有来源 factId 或材料证据的具体事实；
- 是否仍有未解决的同日同项冲突；
- 模板禁止推断项是否出现。

任何硬错误都不能保存为 `completed`。返回 `needs_review` 或 `failed`，前端不展示为可直接使用的完整文书。

### 9.2 AI 语义复核是辅助

AI 只检查模板结构、语言连贯、无关内容、未经材料支持的诊断/治疗/解释和不确定性表达。AI 不能覆盖代码硬质检结论。

### 9.3 统一合同

Node 直连和 Python Agent 都返回相同结构：

```json
{
  "status": "completed | needs_review | failed",
  "bodyText": "",
  "confirmItems": [],
  "quality": {
    "hardErrors": [],
    "warnings": [],
    "usedFactIds": [],
    "excludedSourceIds": [],
    "missingConfirmedFields": []
  },
  "timings": {}
}
```

成功状态只由后端统一 `generationResultState` 决定，不能由某条模型链自行宣布成功。

## 10. 交互与视觉实施

设计基线：微信式、低密度、单任务、低动效。保留现有品牌色，不引入新的组件库或第二套图标系统。

### 10.1 默认输入态

```text
[ + ] [ 单行输入框，可增高到4行 ] [ 当前唯一主动作 ]
```

- 空输入且没有材料：右侧不可用发送按钮。
- 有待加入文字/图片/录音：右侧显示“加入”。
- 输入为空且工作区已有材料：右侧显示“生成”。
- 点击加号后才显示拍照识别、录音转写和选择/更换模板。
- 普通问答由意图结果自动隔离或在歧义时询问，不再要求用户先切换“普通模式”。

### 10.2 模板字段编辑态

- 进入字段编辑后隐藏 Chat 输入框、加号、OCR、录音和生成按钮。
- 页面只呈现当前字段、上一个/下一个以及“保存并继续”。
- 连续填写不会关闭面板；已填字段不再重复显示为待补充。
- 退出字段编辑后恢复 Chat，工作区材料状态立即更新。

### 10.3 键盘状态机

- `keyboard closed`：显示输入区和自定义 tabbar。
- `keyboard opening/open`：关闭加号面板，隐藏 tabbar，输入区紧贴键盘，滚动到当前内容。
- 点击加号时先 `hideKeyboard`，收到高度归零后再打开面板，避免面板和键盘叠加。
- 字段编辑使用独立编辑器；保存按钮固定在键盘上方。
- 关闭字段编辑时等键盘高度归零后再恢复 Chat composer，避免闪跳。
- 页面卸载时注销 `wx.onKeyboardHeightChange`，所有延时器和选择器查询具备清理与过期判断。

### 10.4 全局按钮与图标

在 `app.wxss` 或共享样式中建立统一原语：

- `.ui-button`：统一 `display:flex; align-items:center; justify-content:center; box-sizing:border-box`；
- `.ui-button__icon`：固定正方形容器、`line-height:0`；
- `.ui-button__text`：统一字体、行高和单行规则；
- 重置原生 `button` 的 margin、padding 和 `::after`；
- 禁止以 `top/translate/vertical-align` 为单个图标打补丁。

审计范围包括底部导航、首页快捷入口、AI 工具栏、模板标签、录音页、OCR 页、设备页、结果页和弹窗按钮。

### 10.5 设计参数

- `DESIGN_VARIANCE: 3`：稳定、可预测，不做复杂不对称布局；
- `MOTION_INTENSITY: 2`：仅保留点击、加载和状态切换反馈；
- `VISUAL_DENSITY: 4`：日常工具密度，但同一时间只突出一个主操作。

必须覆盖加载、空、失败、锁定、待确认、处理中、部分成功和恢复状态，并支持减少动画偏好。

## 11. 性能与可观测性

- 多图片 OCR 采用有限并发，默认 2 张并行，避免同时上传过多导致内存和网络抖动。
- 使用文件 hash + OCR engine/version 作为缓存键，相同图片不重复识别。
- 每张材料记录 `prepareMs/uploadMs/ocrMs/structureMs`。
- generation 记录 `snapshotMs/intentMs/modelMs/repairMs/qualityMs/totalMs`。
- 日志只记录 traceId、sourceId、workspaceId、状态、耗时、字数和错误码，不记录完整姓名、OCR 文本、音频正文或图片 base64。
- 前端只展示用户能理解的阶段：正在识别第 N/M 张、正在组织文书、正在核对结果。

## 12. 数据库和迁移

新增迁移 `009-ai-material-structure-and-generation-quality.sql`：

- `ai_materials.structured_facts JSON NULL`；
- `ai_materials.quality_state VARCHAR(32) NOT NULL DEFAULT 'ready'`；
- `ai_generations.quality_report JSON NULL`；
- `ai_generations.timings JSON NULL`；
- 可选 `ai_intent_decisions`，只保存动作 JSON、置信度、材料版本、确认/执行状态和时间，不保存无必要的完整敏感原文。

内存 repository、SQL repository、row mapper、schema.sql 和 migration smoke 必须同步修改。旧数据默认 `structured_facts=[]`，可无损读取，不进行破坏性迁移。

## 13. 开发顺序

### Phase A：合同和回归样本先行

1. 固化真实“双化验单 + 大病历 + 姓名王大力”匿名 golden fixture。
2. 建立 OCR tuple、快照、意图、硬质检和延迟断言。
3. 先让测试证明当前实现会失败，再开始修改生产代码。

### Phase B：复用普通 OCR 并保持来源

1. Chat 接入 `image-pipeline`，删除固定压缩路径。
2. OCR 返回并保留 regions/lines/structured facts。
3. 每张图独立写入工作区，失败不加入。
4. 补重复图、无日期、无区间、跨图和切模板竞态测试。

### Phase C：混合意图和单一输入动作

1. 新增 workspace intent 合同和后端模块。
2. 把前端正则降级为确定性 UI 辅助。
3. 支持多意图、置信度、单问题确认、side chat 隔离和撤销。
4. 字段编辑态只保留一个主操作。

### Phase D：快照、生成和质检

1. snapshot 携带结构化事实和来源。
2. 修订恢复原 snapshot 和材料。
3. 检验事实使用确定性渲染或 factId 绑定。
4. 统一 Node/Python 结果合同和成功判定。
5. 删除“篇幅偏短就全文重写”的默认路径。

### Phase E：Chat、键盘和全局按钮

1. 微信式单行 composer 和加号面板。
2. 键盘状态机与 tabbar/safe-area 处理。
3. 统一按钮/图标原语并逐页替换位移补丁。
4. 真机检查 iOS、Android、字体放大、小屏和快速开关键盘。

### Phase F：真实服务与发布验收

1. 运行所有离线 smoke 和 `npm run release:check`。
2. 在明确授权下运行真实 OCR + 当前 DeepSeek 的完整数据流评测。
3. 记录每阶段耗时和最终正文，与 golden 预期人工核对。
4. 独立审查 Agent 以系统架构师和小白用户身份验收代码、数据流、交互和正文质量。
5. P0/P1 清零、真机通过、真实质量通过后才允许推送部署。

### 13.1 文件级实施地图

| 改造内容 | 主要修改文件 | 明确复用 |
|---|---|---|
| Chat 图片准备 | `pages/ai/detail.js`、`services/ocr/image-pipeline.js`、`services/ocr/capture-for-ai.js` | `services/ocr/recognizer.js` |
| OCR 结构化返回 | `backend/src/modules/provider-gateway.js`、`backend/src/ocr/split-lines.js`、`agent-service/app/clients/dashscope.py`、`agent-service/app/agents/ocr.py` | `/api/ocr/recognize` |
| 工作区结构化材料 | `backend/db/migrations/009-*`、`backend/db/schema.sql`、`backend/src/repositories/ai-workspace-repository.js`、`backend/src/modules/ai-workspaces.js` | 现有 `ai_materials` |
| 混合意图 | `backend/src/modules/workspace-intent.js`、`backend/src/server.js`、`services/ai/workspace.js`、`pages/ai/detail.js` | 当前 AI provider 配置与工作区权限 |
| 生成快照 | `backend/src/modules/ai-workspaces.js`、`backend/src/modules/agent-api.js` | `ai_generations.snapshot` |
| 统一质检 | `backend/src/modules/text-quality.js`、`agent-service/app/utils/text_quality.py`、`backend/src/modules/agent-api.js` | 模板合同与写作蓝图 |
| 修订保留原材料 | `backend/src/modules/agent-api.js`、`pages/ai/detail.js` | 原 generation snapshot |
| 单任务 composer | `pages/ai/detail.wxml`、`pages/ai/detail.wxss`、`pages/ai/detail.js` | 当前页面与 TDesign 图标 |
| 键盘状态机 | `pages/ai/detail.js`、`pages/ai/detail.wxss`、`custom-tab-bar/*` | 微信键盘高度事件和 safe-area |
| 全局按钮图标 | `app.wxss` 及逐页 WXML/WXSS | 现有 TDesign 图标族 |
| 合同与回归测试 | `backend/scripts/*-smoke.js`、`backend/test-fixtures/ai-workspace/*`、`backend/scripts/release-check.js` | 当前 release check 框架 |

任何实现如果需要新增不在表中的服务，必须先证明现有唯一真源无法扩展，并先更新本方案；不得直接增加平行模块。

### 13.2 兼容发布顺序

1. 先发布新增字段的数据库迁移；旧代码读取不受影响。
2. 后端先支持旧材料和新结构化材料双读，写新字段但不强制客户端使用。
3. 发布新小程序，使 Chat 复用普通 OCR 并写入结构化来源。
4. 打开新硬质检成功门槛；旧 generation 仍可读取，但新 generation 使用新合同。
5. 真实服务与真机稳定后，删除 Chat 固定压缩、前端语义正则和废弃的兼容分支。

上线过程不得长期保留两套行为真源。兼容分支必须带移除条件和回归测试。

### 13.3 实施纪律

- 每个 Phase 开始前，先提交对应失败测试或 golden 断言。
- 每个生产改动必须能对应到本方案的一个条目和一个验收断言。
- 如果实现发现方案与真实代码不一致，先更新本方案并记录原因，再修改代码。
- 不以“模型大概能理解”代替数据合同，不以“代码能编译”代替真实内容质量。
- 不在一个提交中同时重写 OCR、意图、生成和 UI；按 Phase 保持可回滚边界。

## 14. 必测极端情况

- 重复图片、重叠图片、模糊/反光/缺角、方向错误、双栏和跨页表格；
- OCR 空、失败、超时、乱码、小数点/上下箭头/指数单位错误；
- 无日期、无参考区间、同日同项冲突、不同日期趋势；
- 图片中其他姓名按当前任务身份规则处理；
- 无关图片、图片内 prompt injection；
- 多条录音、录音中断、转写失败、重复转写和低置信度数字；
- 一句话同时包含患者事实、修改和生成；
- 普通闲聊、模糊提问、取消、覆盖、排除和撤销；
- 模板切换、关闭、恢复、版本更新和权限中途失效；
- 重复点击生成、生成中新增材料、超时重试和登录 401 恢复；
- 小屏、大字体、键盘快速开关、加号面板、字段编辑和 tabbar 遮挡。

## 15. 交付门槛

以下条件全部满足才算完成：

- “王大力 + 两张真实化验单”结果中姓名正确，报告日期、项目、结果、单位、参考区间和异常标志不跨图错配；
- 未提供内容不编造，模板示例事实不进入正文；
- OCR/ASR 失败不能静默生成；
- 未解决硬冲突和 confirmed field 遗漏不能标为 completed；
- 一般自然语言不依赖不断增长的前端正则，AI 意图只能产生白名单动作；
- 字段编辑时界面只有一个主要任务，键盘和底部导航不遮挡；
- 全局抽样页面图标与文字同轴居中；
- 普通能力和专业能力的后端权限边界无回归；
- 离线发布检查、真实服务质量评测、真机检查和独立复审全部通过。

## 16. 明确不做

- 不新增第三套 OCR、ASR、模板或生成实现；
- 不把整段 Chat 历史当作文书事实来源；
- 不把图片 base64 存入材料 JSON 或 generation snapshot；
- 不让 AI 直接执行数据库操作、权限判断或破坏性动作；
- 不用更多按钮、说明卡片和模式切换掩盖流程问题；
- 不以 release smoke 通过代替真实图片、真实模型和真机质量验收。

## 17. 2026-08-18 实施与验收记录

### 17.1 已实施

- Chat 图片复用普通 OCR 的 `image-pipeline -> recognizer -> /api/ocr/recognize` 链路；只有超过 5 MiB 才分级压缩，不再固定降到 1280px/70%。
- 每张图片保留独立 `sourceId/pageIndex/reportDate/documentMetadata/structuredFacts`，表格检验结果使用服务端确定性渲染。
- 报告表头中的性别、年龄、号码、科别、标本类型和初步诊断作为独立必保留来源事实；漏写会定向重写，再失败则进入 `needs_review`。
- 模板字段、文字、OCR、ASR 以材料类型和固定优先级进入不可变 generation snapshot；修订恢复原 snapshot，不丢材料。
- 混合意图收敛为后端白名单动作，普通问答与当前文书任务隔离。
- 硬质检覆盖确认字段、表头事实、检验 tuple、日期、参考区间、异常标志、来源冲突和 AI 无依据专业判断。
- Node 直连和 Python TextAgent/Orchestrator 使用同一成功标准；无明确材料的诊断、诊断依据和鉴别诊断章节由代码硬删除，其他临床推断由 AI 逐句依据复核。
- Chat 收敛为微信式单行起始 composer；字段编辑时隐藏 Chat 和其他主动作；键盘、加号面板和 tabbar 状态互斥。
- 主要图标改为固定 SVG 资产，全局 `t-icon` 容器对齐；打包排除评测产物、未注册页面和已内嵌的重复字体。

### 17.2 已通过证据

- `npm.cmd run release:check`：`RELEASE_CHECK_OK`。
- 小程序原始主包门禁：`1797.7 KiB < 1900 KiB`，评测临时文件不进包。
- 真实 5 模板 DeepSeek 评测：`5/5 passed`（会诊、首次病程、出院记录、72 小时沟通、大病历）。
- Python 真实服务：`PYTHON_AGENT_QUALITY_SMOKE_OK` 和 `PYTHON_ORCHESTRATOR_QUALITY_SMOKE_OK`。
- 人工逐行核对两张原图并固化不可自动生成的 38 行 + 25 行 golden；旧 OCR 产物曾把 TBA/TBIL/DBIL/IBIL 的参考区间串列并误写 APOA 单位，该旧结论已撤销，不能作为通过证据。
- 改用同一 `/api/ocr/recognize` 的 `qwen3-vl-flash` 结构化表格模式后，无缓存真实双图 OCR + DeepSeek 对人工 golden 的 63 条检验 tuple 逐行逐列一致，`status=ok`，`hardErrors=0`，`missingConfirmedFields=0`，`sourceConflicts=0`；姓名王大力、性别、年龄、住院号、初步诊断均进入正文，申请日期未被改写为报告日期。
- 2026-08-18 最终无缓存运行：两张 OCR 分别约 `32.4s / 25.2s`；正式小程序以最多 2 张并行，OCR 等待按较慢一张计算；生成、定向修复及依据复核约 `7.6s`。相同图片命中 engine/version/hash 缓存后 OCR 为毫秒级。
- 完整真实产物：`backend/.tmp/real-quality/latest-result.json`。

### 17.3 仍需发布环节完成

- 微信开发者工具已开启 CLI 服务设置，但当前已运行 IDE 未重载端口，本轮 CLI 预览编译未完成。
- iOS/Android 真机的小屏、字体放大、键盘快速开关、蓝牙实连、图标视觉对齐仍需用户侧执行最终验收。
- 生产库必须先执行 `009-ai-material-structure-and-generation-quality.sql`，再发布后端和小程序；未获得本次明确推送/部署指令前不执行外部变更。

### 17.4 恢复性、材料决策与最终临床样本收敛

- `ai_generations` 增加 `claim_token/claimed_at`；生成任务使用带所有者令牌的动态安全租约（至少 180 秒，且覆盖模型调用上限与 60 秒裕量），崩溃或超时后可重新领取，旧领取者不得覆盖新结果。
- `ai_materials` 增加 `relevance_state`；结构化报告由代码直接判为相关，其他 OCR/ASR 由受控 AI 分类为 `relevant/irrelevant/needs_review`，不确定材料未经用户选择不得生成。
- 同一 `clientMaterialId` 是幂等更新键：完全相同的重试不增加版本，重新 OCR 得到的新文本、tuple 和质量状态会替换旧材料。
- 工作区向意图模型提供受控的“序号 + 类型 + 摘要 + ID”材料目录；“移除第二张图片”等确定表达先由代码映射，破坏性动作仍要用户确认。
- Chat 只显示一个紧凑的“已加入 N 份材料”入口；展开后才可保留/移除单份材料。存在待确认材料时，“生成”被阻断，但仍允许继续添加新材料。
- 图片 OCR 前端工作池上限为 2；每张材料记录 `prepareMs/uploadMs/ocrMs/structureMs/totalMs`。
- 2026-08-18 使用缓存 OCR + 当前 DeepSeek 重跑真实双图：63/63 tuple 一致，姓名王大力保留，申请日期未冒充报告日期，空章节已删除，待确认项收敛为 1 条，生成约 2.24 秒。

### 17.5 最终稳定性补充验收

- 章节归属增加确定性硬约束：初步诊断只能进入诊断章节；申请日期、标本、仪器和检查项目不得进入主诉或现病史；模型输出合并标题时仍可识别章节边界。
- AI 依据复核仅作为补充门禁；当结构化来源已逐字证明“初步诊断：值”时，代码会消除 AI 审核器对同一句话的随机误报，但不会放过其他无来源诊断。
- 识别质量为 `needs_review/failed` 的材料不能通过“保留”直接改为 `ready`，只能移除并重新拍照；相关性确认与识别质量确认已分离。
- 材料 PATCH 接口不接受客户端修改 `qualityState`；识别质量只能由服务端 OCR/ASR 新增或同 `clientMaterialId` 重识别覆盖，不能由自制客户端绕过。
- generation claim 租约改为动态安全上限：至少 180 秒，且必须大于 agent 超时 60 秒、覆盖最多三段直连模型调用及 60 秒裕量；旧 claim token 仍不能覆盖新结果。
- 材料目录按类型独立编号；文字、录音、图片混排时，“第二张图片”在前端、确定性解析和 AI 目录中指向同一材料。
- 最终连续两次真实 DeepSeek 生成均为 `status=ok`：63/63 检验 tuple、王大力、来源1日期未提供、来源2申请日期、来源2表头和初步诊断全部正确；`hardErrors=0`、`missingConfirmedFields=0`、`sourceConflicts=0`，生成耗时约 2.3 秒与 3.1 秒。
- 最新 `npm.cmd run release:check` 为 `RELEASE_CHECK_OK`，小程序原始主包约 1806.3 KiB。

### 17.6 2026-08-18 普通 OCR 表格结构化补强

- 普通 OCR 默认使用 `documentMode=auto`：识别到疑似检验/化验表时，自动复用既有表格结构化模型；普通文本仍保留原始 OCR 路径。
- 千问 OCR 返回的 `location` 坐标不再被丢弃，统一保存在 `regions`，供行列重建和人工核对使用。
- 表格行增加 `confidence` 与 `evidence`，结构化结果必须能在对应视觉行证实结果、单位和参考区间；证据缺失或低置信度进入 `uncertainRows`。
- 结构化 OCR 的 `uncertainRows` 在普通 OCR、Chat 和工作区材料之间贯通，不能被当作 `ready` 材料生成。
- 新增 golden 回归：参考区间不在同一行证据中时必须进入待核对，正确行绑定保持通过。
- 本轮离线验证：`node backend/scripts/ai-workspace-golden-smoke.js`、`node backend/scripts/ocr-worker-smoke.js`、`npm.cmd run release:check` 全部通过；真实千问服务和真机视觉仍需单独验收。
