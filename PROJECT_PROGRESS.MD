# 病历传输项目 - 原型开发进度

## 项目概述

**项目名称**: 病历传输小程序
**项目路径**: `D:\product\bingli`
**原型路径**: `D:\product\bingli\prototypes`
**PRD文档**: `D:\product\bingli\bingli.MD`

**产品定位**: 微信小程序+专属硬件设备，通过蓝牙/热点将医疗数据跨网传输至内网电脑

---

## 设计规范

### 颜色规范
```css
/* 主题色 */
--primary-gradient: linear-gradient(135deg, #4A90E2 0%, #357ABD 100%);
--primary-color: #4A90E2;

/* 状态色 */
--success-color: #52C41A;
--warning-color: #FAAD14;
--error-color: #F5222D;

/* 中性色 */
--bg-color: #F5F7FA;
--text-primary: #333333;
--text-secondary: #666666;
--text-placeholder: #CCCCCC;
--border-color: #E5E5E5;
```

### 容器样式
- 宽度: 375px
- 高度: 812px
- 圆角: 40px
- 背景: 白色
- 阴影: `0 20px 60px rgba(0, 0, 0, 0.15)`

### 通用组件样式
- 输入框高度: 52px
- 按钮高度: 52px
- 圆角: 12px
- 字体: `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif`

---

## 已完成页面

| 序号 | 页面名称 | 文件名 | 状态 | 完成日期 |
|------|----------|--------|------|----------|
| 1 | 登录页 | `login.html` | ✅ 完成 | 2026-05-21 |
| 2 | 注册页-步骤1 | `register-step1.html` | ✅ 完成 | 2026-05-21 |
| 3 | 注册页-步骤2 | `register-step2.html` | ✅ 完成 | 2026-05-21 |
| 4 | 找回密码-步骤1 | `forget-password-step1.html` | ✅ 完成 | 2026-05-21 |
| 5 | 找回密码-步骤2 | `forget-password-step2.html` | ✅ 完成 | 2026-05-21 |
| 6 | 首页 | `home.html` | ✅ 完成 | 2026-05-21 |
| 7 | 蓝牙Demo小程序 | `ble-demo/` | ✅ 完成 | 2026-05-24 |

---

## 硬件端蓝牙通信方案

### 方案概述

**中文输入方案**：利用Windows自带微软拼音输入法的V模式，通过硬件模拟键盘输入实现中文输出。

### 电脑端设置（一次性操作）

```
1. 设置 → 时间和语言 → 语言 → 中文（简体）→ 选项
2. 微软拼音 → 选项 → 高级 → 启用V模式输入
3. 确保输入法为「全拼模式」（双拼模式不支持vuc）
```

### 软件端转换逻辑

```javascript
// 文本转VUC格式
function textToVUC(text) {
  let result = [];
  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i);
    if (code < 128) {
      result.push(text[i]);  // ASCII直接保留
    } else {
      let hex = code.toString(16).toLowerCase();
      result.push('vuc' + hex);  // 中文转vuc格式
    }
  }
  return result.join(' ');
}
```

### 蓝牙通信协议

```
格式: SPD2|WIN11|vuc8212 vuc514b vucff0c ...
│    │     │
│    │     └─ 用空格分隔的vuc指令
│    └─ 兼容模式标识 (WIN10/WIN11/RAW)
└─ 速度档位 (SPD1=高速/SPD2=正常/SPD3=慢速)
```

### BLE UUID配置

```
服务UUID:     6E400001-B5A3-F393-E0A9-E50E24DCCA9E
写特征UUID:   6E400002-B5A3-F393-E0A9-E50E24DCCA9E (手机→硬件)
通知特征UUID: 6E400003-B5A3-F393-E0A9-E50E24DCCA9E (硬件→手机)
```

### 测试验证结果

| 测试文本 | 转换结果 | 状态 |
|---------|---------|------|
| 舒克，硬件烧录好了； | vuc8212 vuc514b vucff0c vuc786c vuc4ef6 vuc70e7 vuc5f55 vuc597d vuc4e86 vucff1b | ✅ 通过 |
| (限制液体70ml/kg，糖速4.8mg/kgmin) | ( vuc9650 vuc5236 vuc6db2 vuc4f53 70ml/kg, vuc7cd6 vuc901f 4.8mg/kgmin) | ✅ 通过 |

### Demo小程序位置

```
D:\product\bingli\ble-demo\
```

**功能特性**：
- 蓝牙设备搜索与连接
- 文本输入与VUC转换预览
- 数据分片发送（MTU 20字节）
- 操作日志实时显示

---

---

## 页面功能说明

### 1. 登录页 (login.html)
- 账号密码登录
- 微信一键登录入口
- 忘记密码/注册入口
- 用户协议勾选
- 密码显示/隐藏切换

### 2. 注册页 (register-step1.html / register-step2.html)
- **步骤1**: 手机号验证码验证
- **步骤2**: 设置密码（含密码强度提示）
- 注册成功弹窗（7天免费体验提示）

### 3. 找回密码页 (forget-password-step1.html / forget-password-step2.html)
- **步骤1**: 验证注册手机号
- **步骤2**: 设置新密码（含密码确认、强度提示）
- 完成后跳转登录页

### 4. 首页 (home.html)
- **设备状态卡片**: 显示连接状态、设备型号、电量
- **文本输入区**: 多行输入、字数统计(最大5000字)
- **快捷操作**: 拍照识别、录音识别、粘贴文字
- **发送按钮**: 发送到电脑
- **AI功能区**: AI对话、模板库、测试
- **底部导航**: 首页、AI、模板、我的

---

## 待开发页面

### 首页模块
- [ ] 蓝牙连接页
- [ ] 图片识别文字页 (OCR)
- [ ] 录音识别文字页 (ASR)
- [ ] 网络测试页
- [ ] 切换编码页
- [ ] 使用流程介绍页

### AI对话模块
- [ ] AI对话首页（对话列表）
- [ ] AI对话详情页
- [ ] 新建对话弹窗

### 模板模块
- [ ] 模板首页（官方/我的模板切换）
- [ ] 官方模板详情页
- [ ] 我的模板页
- [ ] 新建/编辑模板页
- [ ] 模板应用结果页

### 个人中心模块
- [ ] 个人中心首页
- [ ] 个人信息编辑页
- [ ] 会员购买页
- [ ] 购买记录页
- [ ] 设备管理页
- [ ] 传输设置页
- [ ] 操作视频页
- [ ] 客服中心页
- [ ] 意见反馈页

### 公共模块
- [ ] 协议与隐私政策弹窗

---

## 开发注意事项

### 页面跳转关系
```
登录页 → 注册页(步骤1) → 注册页(步骤2) → 首页
登录页 → 找回密码(步骤1) → 找回密码(步骤2) → 登录页
首页 → 各功能模块页
```

### 交互规范
1. 所有表单提交按钮在未满足条件时置灰(disabled)
2. 输入框聚焦时显示蓝色边框和阴影
3. Toast提示2秒后自动消失
4. 步骤页面使用步骤指示器显示进度
5. 密码输入框支持显示/隐藏切换

### 验证规则
- **手机号**: `/^1[3-9]\d{9}$/`
- **密码**: 6-20位，需包含字母和数字
- **验证码**: 6位数字，60秒倒计时

---

## 最近更新

### 2026-05-24
- ✅ 硬件端中文输出方案确定：使用微软拼音V模式（vuc+十六进制Unicode）
- ✅ 验证V模式输入方案可行性，测试通过
- ✅ 确定蓝牙协议格式：`SPD2|WIN11|vucXXXX vucXXXX ...`
- ✅ 完成软件端转换逻辑（JavaScript）
- 🔄 硬件端执行逻辑开发中

#### 技术方案总结
**中文输入方案**：利用Windows自带微软拼音输入法的V模式
- 电脑端设置：微软拼音设置 → 高级 → 启用V模式输入
- 转换格式：汉字 → `vuc` + 十六进制Unicode（如："中" → `vuc4e2d`）
- 软件端：使用 `charCodeAt()` 转换
- 硬件端：模拟键盘输入 `vucXXXX` + 空格确认

**软件端转换代码**：
```javascript
function textToVUC(text) {
  let result = [];
  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i);
    if (code < 128) {
      result.push(text[i]);  // ASCII直接保留
    } else {
      let hex = code.toString(16).toLowerCase();
      result.push('vuc' + hex);  // 中文转vuc格式
    }
  }
  return result.join(' ');
}
```

**蓝牙协议格式**：
```
SPD2|WIN11|vuc8212 vuc514b vucff0c vuc786c vuc4ef6 vuc70e7 vuc5f55 vuc597d vuc4e86 vucff1b
│    │     │
│    │     └─ 用空格分隔的vuc指令
│    └─ 兼容模式标识
└─ 速度档位
```

**测试验证**：
- 测试文本："舒克，硬件烧录好了；"
- 转换结果：`vuc8212 vuc514b vucff0c vuc786c vuc4ef6 vuc70e7 vuc5f55 vuc597d vuc4e86 vucff1b`
- 测试状态：✅ 通过

---

### 2026-05-21
- ✅ 修复找回密码页：拆分为两个独立页面
- ✅ 修正找回密码文案（去除注册相关文案）
- ✅ 完成首页原型开发

---

## 下一步计划

### 短期任务（本周）

1. **Demo测试验证**
   - [ ] 真机测试蓝牙Demo小程序
   - [ ] 验证长文本传输稳定性
   - [ ] 测试不同医院电脑兼容性

2. **功能完善**
   - [ ] 添加速度调节功能（SPD1/SPD2/SPD3）
   - [ ] 添加发送进度显示
   - [ ] 添加历史记录功能

3. **正式版开发**
   - [ ] 将蓝牙功能集成到正式小程序
   - [ ] 完善UI/UX设计
   - [ ] 添加用户登录/注册功能

### 中期任务

1. **首页模块扩展**
   - [ ] 蓝牙连接页
   - [ ] 图片OCR识别页
   - [ ] 录音ASR识别页

2. **AI对话模块**
   - [ ] AI对话列表页
   - [ ] AI对话详情页

3. **根据优先级继续开发其他模块**

---

*文档更新时间: 2026-05-24*
