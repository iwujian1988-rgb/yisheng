# 阿里云后端架构

## 推荐部署

V1 推荐：
- ECS：部署 Node.js API 服务、管理后台 Web、OCR/ASR worker。
- RDS MySQL：业务数据库。
- OSS：存放 OCR 图片、ASR 音频的临时对象。
- SLB/Nginx：HTTPS 入口和反向代理。
- Redis：session、验证码、限流和短期任务状态。

## 服务拆分

1. API 服务
   - 小程序 API。
   - 管理后台 API。
   - 权限、审计、脱敏、加密历史元数据。

2. 管理后台 Web
   - 独立浏览器后台。
   - 只调用后台 API。
   - 不接触用户病历明文。

3. OCR Worker
   - 免费方案优先：PaddleOCR。
   - 轻量备选：RapidOCR。
   - 输入：OSS 临时图片对象。
   - 输出：识别文本返回给用户确认。
   - 不把图片或识别文本写入业务日志。

4. ASR Worker
   - 推荐：faster-whisper。
   - 输入：OSS 临时音频对象。
   - 输出：转写文本返回给用户确认。

5. AI Gateway
   - 模型：DeepSeek。
   - 小程序不保存 API key。
   - 后端只接收脱敏后的文本。
   - Provider 请求和响应都要做审计元数据记录，但不记录原文。

## OCR 方案

默认选择：PaddleOCR。

原因：
- 开源免费。
- 中文识别成熟。
- 可部署在自有阿里云 ECS。
- 对医疗场景可逐步训练或微调。

备选：RapidOCR。

适用：
- ECS 配置较低。
- 先追求轻量和快速上线。

不建议 MVP 默认使用：
- 阿里云付费 OCR。

原因：
- 用户明确要求 OCR 免费。
- 医疗文本还涉及数据边界，先自托管更可控。

## 数据边界

- 小程序端上传图片/音频到后端。
- 后端只保存临时文件引用，不长期保存原始图片/音频，除非用户明确授权。
- OCR/ASR 结果必须经过用户确认后才能进入草稿或发送链路。
- 管理员后台只看统计、状态、错误类型、长度等元数据。
- AI 调用必须使用脱敏文本。

## 当前代码入口

- 后端骨架：`backend/`
- 管理后台浏览器入口：`/admin/`
- 数据库草案：`backend/db/schema.sql`
- 小程序 API 配置：`app.js` 的 `globalData.baseUrl`
- 小程序 API 客户端：`services/api/client.js`
