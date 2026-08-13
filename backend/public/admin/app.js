var state = { token: '', currentView: 'dashboard' };

var GUIDE_TEXT = [
  '# 文本传输助手 — 模板创建指南',
  '',
  '本文档供 AI 助手参考，用于生成可导入后台的模板定义。',
  '',
  '---',
  '',
  '## 模板是什么',
  '',
  '用户通过微信小程序选择一个模板，填写几个字段（如主题、内容、时间），系统将零散输入整理成结构化文本，用户确认后通过 BLE 设备发送到电脑。',
  '',
  '模板的核心作用：把口语化、零散的用户输入变成结构清晰、可直接使用的工作文本。',
  '',
  '---',
  '',
  '## 模板字段说明',
  '',
  '| 字段 | 类型 | 必填 | 说明 |',
  '|------|------|------|------|',
  '| templateCode | string | 是 | 唯一标识，英文+数字+下划线/短横线，3-64字符，如 meeting_summary |',
  '| name | string | 是 | 显示名称，如"会议纪要" |',
  '| description | string | 否 | 一句话描述模板用途 |',
  '| category | string | 否 | 分类标签，如 record、report、followup |',
  '| audience | string | 否 | "general"（所有用户）或 "professional"（仅会员），默认 general |',
  '| scene | string | 否 | 使用场景，如"会后整理" |',
  '| variableDefs | array | 否 | 用户填写的字段定义（见下方） |',
  '| outputStructure | array | 否 | AI 输出的段落结构（见下方） |',
  '| promptContent | string | 否 | 自定义 AI 提示词（见下方） |',
  '| qualityRules | array | 否 | 质量检查规则（见下方） |',
  '| missingInfoRules | array | 否 | 缺失信息处理规则（见下方） |',
  '| forbiddenRules | array | 否 | 禁止规则（见下方） |',
  '',
  '---',
  '',
  '## variableDefs — 用户填写字段',
  '',
  '定义用户需要填写的输入项。每个字段：',
  '',
  '  key     - 变量名，英文，用于系统内部引用',
  '  label   - 显示给用户的标签，如"关键内容"、"时间地点"',
  '  type    - "input"（单行）或 "textarea"（多行，默认）',
  '  required - 是否必填。必填项为空时 AI 仍会生成，但【待确认】会提示补充',
  '  placeholder - 输入框占位提示文字',
  '',
  '示例：',
  '{"key":"mainInfo","label":"主要内容","type":"textarea","required":true,"placeholder":"请输入要整理的内容"}',
  '',
  '原则：字段宜少不宜多，3-6 个为佳。用户在手机上操作，字段越少体验越好。',
  '',
  '---',
  '',
  '## outputStructure — 输出段落结构',
  '',
  '告诉 AI 正文应该按什么结构组织，是一个字符串数组：',
  '["主要信息", "时间线", "关键数据", "待确认事项"]',
  '',
  'AI 会按这个顺序生成正文段落。如果不设置，AI 会按 variableDefs 的 label 顺序排列。',
  '原则：段落名要具体，让 AI 清楚每段该放什么内容。',
  '',
  '---',
  '',
  '## promptContent — 自定义 AI 指令',
  '',
  '这是最关键的字段。告诉 AI 这个模板的特殊处理规则。',
  '',
  '示例：',
  '你是一个会议纪要整理助手。',
  '将口语化的会议记录整理为正式纪要格式。',
  '发言内容按发言人归类，提炼核心观点，去除语气词和重复内容。',
  '时间、地点、参会人作为开头信息独立列出。',
  '决策事项用编号列表，明确责任人和截止日期。',
  '',
  '原则：',
  '- 明确角色（"你是…助手"）',
  '- 明确输入到输出的转换规则',
  '- 不要写太长，3-8 行为佳',
  '- 不要写"输出【正文】和【待确认】"——系统会自动添加',
  '',
  '---',
  '',
  '## qualityRules — 质量检查规则',
  '',
  'AI 生成后需要遵守的质量要求：',
  '["保留原始事实边界，不扩展用户未提及的内容", "数字、日期、人名必须与原文完全一致", "口语化表达转为书面语，但不改变原意"]',
  '',
  '---',
  '',
  '## missingInfoRules — 缺失信息处理规则',
  '',
  '当用户没有提供某些信息时，AI 应该怎么处理：',
  '["未提供的信息标记为「待补充」，不能猜测或编造", "缺失的关键数字放入【待确认】"]',
  '',
  '---',
  '',
  '## forbiddenRules — 禁止规则',
  '',
  '明确告诉 AI 不能做什么：',
  '["不得新增用户未提供的任何事实", "不得输出法律、医疗等专业性承诺或建议", "不得在正文中添加解释性说明"]',
  '',
  '---',
  '',
  '## 完整示例：创建一个"会议纪要"模板',
  '',
  '```json',
  '{',
  '  "templateCode": "meeting_minutes",',
  '  "name": "会议纪要",',
  '  "description": "将会议记录整理为结构化纪要",',
  '  "category": "record",',
  '  "audience": "general",',
  '  "scene": "会后整理",',
  '  "variableDefs": [',
  '    {"key":"meetingTopic","label":"会议主题","type":"input","required":true,"placeholder":"本次会议讨论什么"},',
  '    {"key":"meetingTime","label":"时间地点","type":"input","required":false,"placeholder":"如：6月11日下午3点 会议室A"},',
  '    {"key":"attendees","label":"参会人员","type":"input","required":false,"placeholder":"如：张三、李四、王五"},',
  '    {"key":"rawNotes","label":"会议记录","type":"textarea","required":true,"placeholder":"粘贴或输入会议中的零散记录"}',
  '  ],',
  '  "promptContent": "你是一个会议纪要整理助手。将口语化的会议记录整理为正式纪要。\\n发言内容按主题归类，提炼核心观点，去除语气词和重复。\\n时间地点参会人作为开头信息列出。\\n决策事项用编号列表，明确责任人和截止日期。",',
  '  "outputStructure": ["基本信息","讨论内容","决策事项","后续行动"],',
  '  "qualityRules": ["发言人与发言内容必须对应正确","决策事项必须有明确的执行人","时间日期与原文一致"],',
  '  "missingInfoRules": ["未提供参会人员则标注「待补充」","缺失的决策细节放入【待确认】"],',
  '  "forbiddenRules": ["不得编造未讨论的话题","不得擅自添加行动项的截止日期"]',
  '}',
  '```',
  '',
  '---',
  '',
  '## 设计原则总结',
  '',
  '1. 只整理，不创造：AI 只能重组用户输入，不能新增内容',
  '2. 字段精简：手机端填写，3-6 个字段最佳',
  '3. 结构明确：outputStructure 让输出可预测',
  '4. 规则兜底：qualityRules + missingInfoRules + forbiddenRules 三层保护',
  '5. 先 draft 再 publish：创建后可预览效果，确认后再发布',
  '',
  '---',
  '',
  '## 常见模板类型参考',
  '',
  '| 类型 | templateCode 示例 | 场景 |',
  '|------|-------------------|------|',
  '| 会议纪要 | meeting_minutes | 会后整理记录 |',
  '| 工作日报 | daily_report | 每日工作总结 |',
  '| 客户跟进 | customer_followup | 拜访/通话后记录 |',
  '| 项目汇报 | project_update | 阶段性进展汇报 |',
  '| 培训记录 | training_record | 培训内容整理 |',
  '| 数据报告 | data_report | 数据指标说明 |',
  '| 物料清单 | material_list | 设备/物品清单整理 |',
  '| 问题追踪 | issue_tracking | 问题描述与处理记录 |'
].join('\n');


var viewTitles = {
  dashboard: ['总览', '后台 API 联调入口'],
  paidUsers: ['服务用户', '管理开通状态和设备交付'],
  devices: ['设备', '预置设备、批量导入、查看绑定状态'],
  templates: ['模板', '维护通用模板和专业模板'],
  agentTemplates: ['官方 Agent 模板', '维护 agentTemplates 官方 fields / sample'],
  templateGuide: ['模板创建指南', '发给 AI 助手，让它帮你写模板 JSON'],
  quickActions: ['快捷任务', '维护 AI 聊天的任务芯片和提示词'],
  activationCodes: ['激活码', '导入和查看服务激活码'],
  orderEntitlements: ['电商会员权益', '导入订单收货手机号，并按客服申请改绑'],
  auditLogs: ['审计日志', '查看后台关键操作记录']
};

function $(id) { return document.getElementById(id); }

function escapeHtml(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setHidden(el, hidden) { el.classList.toggle('hidden', hidden); }

function statusLabel(value) {
  var map = {
    active: '有效',
    expired: '已过期',
    disabled: '已停用',
    pending: '待处理',
    claimed: '已领取',
    completed: '已完成',
    hardware_only: '仅硬件',
    unused: '未使用',
    used: '已使用',
    draft: '草稿',
    published: '已发布',
    bound: '已绑定',
    unbound: '未绑定',
    reserved: '已预留',
    none: '未开通'
  };
  return map[value] || value || '';
}

function badge(text, type) {
  return '<span class="badge ' + (type || '') + '">' + escapeHtml(text) + '</span>';
}

function badgeForStatus(value) {
  if (value === 'active' || value === 'published' || value === 'used' || value === 'bound') {
    return badge(statusLabel(value), 'badge-success');
  }
  if (value === 'expired' || value === 'disabled') return badge(statusLabel(value), 'badge-danger');
  return badge(statusLabel(value), 'badge-warning');
}

async function api(path, options) {
  var response = await fetch(path, Object.assign({
    headers: {
      'Content-Type': 'application/json',
      Authorization: state.token ? 'Bearer ' + state.token : ''
    }
  }, options || {}));
  var payload = await response.json();
  if (!response.ok || payload.code !== 'OK') throw new Error(payload.message || payload.code || '请求失败');
  return payload.data;
}

function renderTable(container, columns, rows, actions) {
  if (!rows || !rows.length) {
    container.innerHTML = '<p class="empty">暂无数据</p>';
    return;
  }
  var head = columns.map(function (column) {
    return '<th>' + escapeHtml(column.label) + '</th>';
  }).join('') + (actions ? '<th>操作</th>' : '');
  var body = rows.map(function (row) {
    var cells = columns.map(function (column) {
      var value = column.render ? column.render(row) : escapeHtml(row[column.key] || '');
      return '<td>' + value + '</td>';
    }).join('');
    return '<tr>' + cells + (actions ? '<td>' + actions(row) + '</td>' : '') + '</tr>';
  }).join('');
  container.innerHTML = '<table><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table>';
}

async function renderDashboard() {
  var stats = await api('/api/admin/dashboard');
  $('dashboardView').innerHTML = [
    '<div class="grid">',
    '<div class="card"><div>用户数</div><div class="metric">' + escapeHtml(stats.totalUsers || 0) + '</div></div>',
    '<div class="card"><div>有效服务</div><div class="metric">' + escapeHtml(stats.activeUsers || 0) + '</div></div>',
    '<div class="card"><div>绑定设备</div><div class="metric">' + escapeHtml(stats.boundDevices || 0) + '</div></div>',
    '<div class="card"><div>待处理反馈</div><div class="metric">' + escapeHtml(stats.pendingFeedbacks || 0) + '</div></div>',
    '</div>'
  ].join('');
}

async function renderPaidUsers() {
  var data = await api('/api/admin/paid-users');
  $('paidUsersView').innerHTML = [
    '<div class="toolbar"><div class="inline-form">',
    '<input id="openIdentityInput" placeholder="userId / openid / 手机号">',
    '<input id="openExpiryInput" placeholder="到期时间，例如 2027-06-04">',
    '<input id="openSerialInput" placeholder="设备序列号，可选">',
    '<button id="openUserBtn">开通</button>',
    '</div><a class="download" href="/api/admin/exports/users.csv" target="_blank">导出 CSV</a></div>',
    '<div id="paidUsersTable"></div>'
  ].join('');
  $('openUserBtn').onclick = openPaidUser;
  renderTable($('paidUsersTable'), [
    { key: 'phone', label: '手机号' },
    { key: 'openidMasked', label: '微信身份' },
    { key: 'memberStatus', label: '服务状态', render: function (row) { return badgeForStatus(row.memberStatus); } },
    { key: 'memberEnd', label: '到期时间' },
    { key: 'boundDevice', label: '绑定设备' }
  ], data.list);
}

async function renderDevices() {
  var data = await api('/api/admin/devices');
  $('devicesView').innerHTML = [
    '<div class="split"><section class="panel form-panel">',
    '<h2>预置设备</h2>',
    '<label>序列号<input id="deviceSerialInput" placeholder="TXT-HID-001"></label>',
    '<label>校验码<input id="deviceProofInput" placeholder="用户绑定时输入"></label>',
    '<label>预留用户 ID<input id="deviceReservedUserInput" placeholder="可选：user_xxx"></label>',
    '<label>型号<input id="deviceModelInput" placeholder="TXT-HID"></label>',
    '<button id="createDeviceBtn">保存设备</button><hr>',
    '<h2>批量导入</h2>',
    '<label>CSV 文本<textarea id="deviceImportTextInput" placeholder="serialNo,proofCode,model&#10;TXT-HID-001,2468,TXT-HID"></textarea></label>',
    '<div class="row-actions"><button id="importDevicesBtn">导入设备</button><a class="download" href="/api/admin/exports/device-import-template.csv" target="_blank">下载模板</a></div>',
    '<p id="deviceImportResult" class="hint"></p>',
    '</section><section class="panel table-panel"><div id="devicesTable"></div></section></div>'
  ].join('');
  $('createDeviceBtn').onclick = createDevice;
  $('importDevicesBtn').onclick = importDevices;
  renderTable($('devicesTable'), [
    { key: 'serialNo', label: '序列号' },
    { key: 'model', label: '型号' },
    { key: 'firmwareVersion', label: '固件' },
    { key: 'bindStatus', label: '绑定状态', render: function (row) { return badgeForStatus(row.bindStatus); } },
    { key: 'hasProofCode', label: '校验码', render: function (row) { return row.hasProofCode ? badge('已设置', 'badge-success') : badge('未设置', 'badge-warning'); } },
    { key: 'boundUserPhone', label: '绑定用户' }
  ], data.list);
}

function defaultVariableJson() {
  return JSON.stringify([
    { key: 'topic', label: '主题', type: 'input', required: true, placeholder: '填写主题' },
    { key: 'content', label: '内容要点', type: 'textarea', required: true, placeholder: '填写已确认的信息' }
  ], null, 2);
}

function extractCategories(list) {
  var seen = {};
  var cats = [];
  (list || []).forEach(function (item) {
    if (item.category && !seen[item.category]) {
      seen[item.category] = true;
      cats.push(item.category);
    }
  });
  return cats;
}

function buildDatalist(id, options) {
  return '<datalist id="' + id + '">' + options.map(function (o) {
    return '<option value="' + escapeHtml(o) + '">';
  }).join('') + '</datalist>';
}

async function renderTemplates() {
  var data = await api('/api/admin/templates');
  var categories = extractCategories(data.list);
  $('templatesView').innerHTML = [
    '<div class="split"><section class="panel form-panel">',
    '<h2>创建模板</h2>',
    '<label>模板编码<input id="tplCodeInput" placeholder="office_custom_note"></label>',
    '<label>模板名称<input id="tplNameInput" placeholder="自定义模板"></label>',
    '<label>说明<input id="tplDescInput" placeholder="一句话说明用途"></label>',
    '<label>模板类型<select id="tplTypeInput"><option value="basic">基础模板</option><option value="ai_enhanced">AI 增强模板</option></select></label>',
    '<label>可见范围<select id="tplAudienceInput"><option value="general">通用（全部用户）</option><option value="professional">专业（需连接设备）</option></select></label>',
    '<label>场景标识<input id="tplSceneInput" list="sceneOptions" placeholder="例如 weekly_report"></label>',
    '<datalist id="sceneOptions"></datalist>',
    '<label>分类<input id="tplCategoryInput" list="categoryOptions" placeholder="输入或选择分类"></label>',
    buildDatalist('categoryOptions', categories),
    '<label>AI 任务说明<textarea id="tplPromptInput" placeholder="只基于用户填写的信息生成正文，不编造事实。"></textarea></label>',
    '<label>字段 JSON<textarea id="tplVarsInput" class="code-input"></textarea></label>',
    '<label>输出结构 JSON<textarea id="tplOutputInput" class="code-input" placeholder=\'["主题","内容要点","结论"]\'></textarea></label>',
    '<label>质量规则<textarea id="tplQualityInput" class="code-input" placeholder=\'每行一条，或 JSON 数组\'></textarea></label>',
    '<label>缺失处理<textarea id="tplMissingInput" class="code-input" placeholder=\'每行一条，或 JSON 数组\'></textarea></label>',
    '<label>禁止规则<textarea id="tplForbiddenInput" class="code-input" placeholder=\'每行一条，或 JSON 数组\'></textarea></label>',
    '<button id="createTemplateBtn">创建模板</button>',
    '</section><section class="panel table-panel"><div id="templatesTable"></div></section></div>'
  ].join('');
  $('tplVarsInput').value = defaultVariableJson();
  $('createTemplateBtn').onclick = createTemplate;
  renderTable($('templatesTable'), [
    { key: 'templateCode', label: '编码' },
    { key: 'name', label: '名称' },
    { key: 'type', label: '类型', render: function (row) { return row.type === 'ai_enhanced' ? badge('AI 增强', 'badge-success') : badge('基础'); } },
    { key: 'audience', label: '可见范围', render: function (row) { return row.audience === 'professional' ? badge('专业', 'badge-warning') : badge('通用'); } },
    { key: 'category', label: '分类' },
    { key: 'status', label: '状态', render: function (row) { return badgeForStatus(row.status); } },
    { key: 'useCount', label: '使用次数' }
  ], data.list, function (row) {
    var nextStatus = row.status === 'published' ? 'draft' : 'published';
    var label = row.status === 'published' ? '下架' : '发布';
    return '<button class="small" data-template-id="' + escapeHtml(row.id) + '" data-status="' + nextStatus + '">' + label + '</button>';
  });
  document.querySelectorAll('[data-template-id]').forEach(function (button) {
    button.onclick = function () {
      updateTemplateStatus(button.dataset.templateId, button.dataset.status).catch(function (error) { alert(error.message); });
    };
  });
}

async function renderQuickActions() {
  var data = await api('/api/admin/quick-actions');
  var list = data.list || data || [];
  var categories = [];
  (list || []).forEach(function (item) {
    if (item.category && categories.indexOf(item.category) === -1) categories.push(item.category);
  });
  $('quickActionsView').innerHTML = [
    '<div class="split"><section class="panel form-panel">',
    '<h2>创建快捷任务</h2>',
    '<label>任务编码<input id="qaCodeInput" placeholder="general_polish"></label>',
    '<label>任务名称<input id="qaNameInput" placeholder="文本润色"></label>',
    '<label>说明<input id="qaDescInput" placeholder="一句话说明"></label>',
    '<label>分类<input id="qaCategoryInput" list="qaCategoryOptions" placeholder="输入或选择分类"></label>',
    '<label>可见范围<select id="qaAudienceInput"><option value="general">通用（全部用户）</option><option value="professional">专业（需连接设备）</option></select></label>',
    buildDatalist('qaCategoryOptions', categories),
    '<label>输入提示<input id="qaPlaceholderInput" placeholder="粘贴需要润色的文本"></label>',
    '<label>AI 规则<textarea id="qaPromptInput" placeholder="你是文本润色助手..."></textarea></label>',
    '<label>输出结构<textarea id="qaOutputInput" class="code-input" placeholder=\'["正文","待确认"]\'></textarea></label>',
    '<label>质量规则<textarea id="qaQualityInput" class="code-input" placeholder=\'每行一条，或 JSON 数组\'></textarea></label>',
    '<label>缺失处理<textarea id="qaMissingInput" class="code-input" placeholder=\'每行一条，或 JSON 数组\'></textarea></label>',
    '<label>禁止规则<textarea id="qaForbiddenInput" class="code-input" placeholder=\'每行一条，或 JSON 数组\'></textarea></label>',
    '<label>排序<input id="qaSortInput" type="number" value="0" placeholder="数字越小越靠前"></label>',
    '<button id="createQuickActionBtn">创建任务</button>',
    '</section><section class="panel table-panel"><div id="quickActionsTable"></div></section></div>'
  ].join('');
  $('createQuickActionBtn').onclick = createQuickAction;
  renderTable($('quickActionsTable'), [
    { key: 'actionCode', label: '编码' },
    { key: 'title', label: '名称' },
    { key: 'audience', label: '可见范围', render: function (row) { return row.audience === 'professional' ? badge('专业', 'badge-warning') : badge('通用'); } },
    { key: 'category', label: '分类' },
    { key: 'sortOrder', label: '排序' },
    { key: 'status', label: '状态', render: function (row) { return badgeForStatus(row.status); } }
  ], list, function (row) {
    var nextStatus = row.status === 'published' ? 'draft' : 'published';
    var label = row.status === 'published' ? '下架' : '发布';
    return '<button class="small" data-qa-id="' + escapeHtml(row.id) + '" data-qa-status="' + nextStatus + '">' + label + '</button>';
  });
  document.querySelectorAll('[data-qa-id]').forEach(function (button) {
    button.onclick = function () {
      updateQuickActionStatus(button.dataset.qaId, button.dataset.qaStatus).catch(function (error) { alert(error.message); });
    };
  });
}

async function createQuickAction() {
  await api('/api/admin/quick-actions', {
    method: 'POST',
    body: JSON.stringify({
      actionCode: $('qaCodeInput').value.trim(),
      title: $('qaNameInput').value.trim(),
      description: $('qaDescInput').value.trim(),
      category: $('qaCategoryInput').value.trim(),
      audience: $('qaAudienceInput').value,
      placeholder: $('qaPlaceholderInput').value.trim(),
      promptContent: $('qaPromptInput').value.trim(),
      outputStructure: parseLinesOrJson($('qaOutputInput').value),
      qualityRules: parseLinesOrJson($('qaQualityInput').value),
      missingInfoRules: parseLinesOrJson($('qaMissingInput').value),
      forbiddenRules: parseLinesOrJson($('qaForbiddenInput').value),
      sortOrder: Number($('qaSortInput').value || 0)
    })
  });
  await renderQuickActions();
}

async function updateQuickActionStatus(id, status) {
  await api('/api/admin/quick-actions/' + encodeURIComponent(id), {
    method: 'PATCH',
    body: JSON.stringify({ status: status })
  });
  await renderQuickActions();
}

async function renderActivationCodes() {
  var data = await api('/api/admin/activation-codes');
  $('activationCodesView').innerHTML = [
    '<div class="toolbar"><div class="inline-form">',
    '<textarea id="codesTextInput" class="short-textarea" placeholder="每行一个激活码"></textarea>',
    '<input id="memberDaysInput" value="365" placeholder="服务天数">',
    '<button id="importCodeBtn">导入</button>',
    '</div></div><div id="codesTable"></div>'
  ].join('');
  $('importCodeBtn').onclick = importActivationCode;
  renderTable($('codesTable'), [
    { key: 'codeMasked', label: '激活码' },
    { key: 'status', label: '状态', render: function (row) { return badgeForStatus(row.status); } },
    { key: 'memberDays', label: '服务天数' },
    { key: 'usedBy', label: '使用用户' }
  ], data.list);
}

async function renderOrderEntitlements() {
  var data = await api('/api/admin/order-entitlements');
  $('orderEntitlementsView').innerHTML = [
    '<div class="toolbar"><div class="inline-form">',
    '<input id="presetEntitlementPhone" placeholder="领取手机号">',
    '<select id="presetEntitlementDays"><option value="365">AI 套餐：1 年</option><option value="730">AI 套餐：2 年</option><option value="36500">AI 套餐：永久（100 年）</option></select>',
    '<button id="presetEntitlementBtn">预设 AI 权益</button>',
    '</div><p class="hint">同一手机号已有待领取权益时，重新预设会覆盖原时长，不会创建重复记录。</p></div>',
    '<div class="toolbar"><div class="inline-form">',
    '<textarea id="orderEntitlementsText" class="short-textarea" placeholder="CSV: orderNo,receiverPhone,skuType,memberDays"></textarea>',
    '<button id="importOrderEntitlementsBtn">导入权益</button>',
    '</div><p class="hint">订单号只用于后台去重，不会在领取页展示。skuType 填 hardware_member 或 hardware_only。</p></div>',
    '<div id="orderEntitlementsTable"></div>'
  ].join('');
  $('presetEntitlementBtn').onclick = function () { presetOrderEntitlement().catch(function (error) { alert(error.message); }); };
  $('importOrderEntitlementsBtn').onclick = function () { importOrderEntitlements().catch(function (error) { alert(error.message); }); };
  renderTable($('orderEntitlementsTable'), [
    { key: 'skuType', label: 'SKU' },
    { key: 'memberDays', label: '会员天数' },
    { key: 'status', label: '状态', render: function (row) { return badgeForStatus(row.status); } },
    { key: 'claimedAt', label: '领取时间' },
    { key: 'updatedAt', label: '更新时间' }
  ], data.items, function (row) {
    return row.status === 'claimed' ? '' : '<button class="small" data-entitlement-id="' + escapeHtml(row.id) + '">改绑手机号</button>';
  });
  document.querySelectorAll('[data-entitlement-id]').forEach(function (button) {
    button.onclick = function () { reassignEntitlement(button.dataset.entitlementId).catch(function (error) { alert(error.message); }); };
  });
}

async function presetOrderEntitlement() {
  var phone = $('presetEntitlementPhone').value.trim();
  if (!/^1[3-9]\d{9}$/.test(phone)) { alert('请输入正确的领取手机号'); return; }
  var memberDays = Number($('presetEntitlementDays').value);
  await api('/api/admin/order-entitlements/preset', {
    method: 'POST',
    body: JSON.stringify({ phone: phone, memberDays: memberDays })
  });
  await renderOrderEntitlements();
  alert('AI 权益已预设');
}

async function renderAuditLogs() {
  var data = await api('/api/admin/audit-logs');
  renderTable($('auditLogsView'), [
    { key: 'operatorAccount', label: '操作人' },
    { key: 'module', label: '模块' },
    { key: 'actionType', label: '动作' },
    { key: 'result', label: '结果' },
    { key: 'createdAt', label: '时间' }
  ], data.list);
}

async function renderCurrentView() {
  var title = viewTitles[state.currentView];
  $('viewTitle').textContent = title[0];
  $('viewSubTitle').textContent = title[1];
  document.querySelectorAll('.view').forEach(function (view) { view.classList.add('hidden'); });
  $(state.currentView + 'View').classList.remove('hidden');
  if (state.currentView === 'dashboard') await renderDashboard();
  if (state.currentView === 'paidUsers') await renderPaidUsers();
  if (state.currentView === 'devices') await renderDevices();
  if (state.currentView === 'templates') await renderTemplates();
  if (state.currentView === 'agentTemplates') await renderAgentTemplates();
  if (state.currentView === 'templateGuide') renderTemplateGuide();
  if (state.currentView === 'quickActions') await renderQuickActions();
  if (state.currentView === 'activationCodes') await renderActivationCodes();
  if (state.currentView === 'orderEntitlements') await renderOrderEntitlements();
  if (state.currentView === 'auditLogs') await renderAuditLogs();
}

async function login() {
  var data = await api('/api/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ account: $('accountInput').value, password: $('passwordInput').value })
  });
  state.token = data.token;
  $('loginState').textContent = data.admin.account + ' / ' + data.admin.role;
  setHidden($('loginPanel'), true);
  setHidden($('contentPanel'), false);
  await renderCurrentView();
}

async function importActivationCode() {
  var codesText = $('codesTextInput').value.trim();
  if (!codesText) { alert('请输入激活码'); return; }
  await api('/api/admin/activation-codes/import', {
    method: 'POST',
    body: JSON.stringify({ codesText: codesText, memberDays: Number($('memberDaysInput').value || 365) })
  });
  await renderActivationCodes();
}

async function importOrderEntitlements() {
  var ordersText = $('orderEntitlementsText').value.trim();
  if (!ordersText) { alert('请输入 CSV 订单数据'); return; }
  var result = await api('/api/admin/order-entitlements/import', { method: 'POST', body: JSON.stringify({ ordersText: ordersText }) });
  await renderOrderEntitlements();
  alert('已导入 ' + result.importedCount + ' 条；未导入 ' + result.rejected.length + ' 条');
}

async function reassignEntitlement(id) {
  var receiverPhone = window.prompt('请输入新的领取手机号');
  if (receiverPhone === null) return;
  var reason = window.prompt('请填写客服改绑原因') || '';
  await api('/api/admin/order-entitlements/' + encodeURIComponent(id) + '/recipient-phone', {
    method: 'PATCH',
    body: JSON.stringify({ receiverPhone: receiverPhone.trim(), reason: reason })
  });
  await renderOrderEntitlements();
}

async function createDevice() {
  var serialNo = $('deviceSerialInput').value.trim();
  if (!serialNo) { alert('请输入设备序列号'); return; }
  await api('/api/admin/devices', {
    method: 'POST',
    body: JSON.stringify({
      serialNo: serialNo,
      proofCode: $('deviceProofInput').value.trim(),
      reservedUserId: $('deviceReservedUserInput').value.trim(),
      model: $('deviceModelInput').value.trim()
    })
  });
  await renderDevices();
}

async function importDevices() {
  var devicesText = $('deviceImportTextInput').value.trim();
  if (!devicesText) { alert('请输入 CSV 文本'); return; }
  var result = await api('/api/admin/devices/import', {
    method: 'POST',
    body: JSON.stringify({ devicesText: devicesText })
  });
  $('deviceImportResult').textContent = '导入成功 ' + result.importedCount + ' 条，错误 ' + result.errorCount + ' 条';
  if (result.errors && result.errors.length) {
    $('deviceImportResult').textContent += '：' + result.errors.map(function (item) {
      return '第 ' + item.rowNumber + ' 行 ' + item.error;
    }).join('；');
  }
  await renderDevices();
}

async function openPaidUser() {
  var identity = $('openIdentityInput').value.trim();
  var expiryDate = $('openExpiryInput').value.trim();
  if (!identity || !expiryDate) { alert('请输入用户标识和到期时间'); return; }
  var body = { expiryDate: expiryDate, serialNo: $('openSerialInput').value.trim() };
  if (/^1\d{10}$/.test(identity)) body.phone = identity;
  else if (identity.indexOf('user_') === 0) body.userId = identity;
  else body.openid = identity;
  await api('/api/admin/paid-users', { method: 'POST', body: JSON.stringify(body) });
  await renderPaidUsers();
}

function parseLinesOrJson(text) {
  text = (text || '').trim();
  if (!text) return [];
  try { var parsed = JSON.parse(text); return Array.isArray(parsed) ? parsed : []; }
  catch (e) { return text.split('\n').map(function (s) { return s.trim(); }).filter(Boolean); }
}

async function createTemplate() {
  var variableDefs;
  try { variableDefs = JSON.parse($('tplVarsInput').value || '[]'); }
  catch (error) { alert('字段 JSON 格式错误'); return; }
  await api('/api/admin/templates', {
    method: 'POST',
    body: JSON.stringify({
      templateCode: $('tplCodeInput').value.trim(),
      name: $('tplNameInput').value.trim(),
      description: $('tplDescInput').value.trim(),
      type: $('tplTypeInput').value,
      audience: $('tplAudienceInput').value,
      scene: $('tplSceneInput').value.trim(),
      category: $('tplCategoryInput').value.trim(),
      promptContent: $('tplPromptInput').value.trim(),
      variableDefs: variableDefs,
      outputStructure: parseLinesOrJson($('tplOutputInput').value),
      qualityRules: parseLinesOrJson($('tplQualityInput').value),
      missingInfoRules: parseLinesOrJson($('tplMissingInput').value),
      forbiddenRules: parseLinesOrJson($('tplForbiddenInput').value)
    })
  });
  await renderTemplates();
}

async function updateTemplateStatus(id, status) {
  await api('/api/admin/templates/' + encodeURIComponent(id), {
    method: 'PATCH',
    body: JSON.stringify({ status: status })
  });
  await renderTemplates();
}

var agentTemplateEditorState = { selectedId: '' };

async function loadAgentTemplateDetail(id) {
  if (!id) return;
  var item = await api('/api/admin/agent-templates/' + encodeURIComponent(id));
  agentTemplateEditorState.selectedId = item.id;
  $('agentTplIdInput').value = item.id;
  $('agentTplTypeInput').value = item.template_type || '';
  $('agentTplNameInput').value = item.name || '';
  $('agentTplStatusInput').value = item.status || 'active';
  $('agentTplFieldsInput').value = JSON.stringify(item.fields || {}, null, 2);
  $('agentTplSampleInput').value = item.sample || '';
}

async function renderAgentTemplates() {
  var data = await api('/api/admin/agent-templates');
  $('agentTemplatesView').innerHTML = [
    '<div class="split"><section class="panel form-panel">',
    '<h2>编辑官方模板</h2>',
    '<label>模板 ID<input id="agentTplIdInput" readonly></label>',
    '<label>模板类型<input id="agentTplTypeInput" readonly></label>',
    '<label>名称<input id="agentTplNameInput"></label>',
    '<label>状态<select id="agentTplStatusInput"><option value="active">active</option><option value="archived">archived</option></select></label>',
    '<label>fields JSON<textarea id="agentTplFieldsInput" class="code-input" rows="16"></textarea></label>',
    '<label>sample 样例<textarea id="agentTplSampleInput" class="code-input" rows="12"></textarea></label>',
    '<button id="saveAgentTemplateBtn">保存</button>',
    '</section><section class="panel table-panel"><div id="agentTemplatesTable"></div></section></div>'
  ].join('');
  $('saveAgentTemplateBtn').onclick = saveAgentTemplate;
  renderTable($('agentTemplatesTable'), [
    { key: 'id', label: 'ID' },
    { key: 'template_type', label: '类型' },
    { key: 'name', label: '名称' },
    { key: 'status', label: '状态', render: function (row) { return badgeForStatus(row.status); } },
    { key: 'updated_at', label: '更新时间' }
  ], data.list, function (row) {
    return '<button class="small" data-agent-template-id="' + escapeHtml(row.id) + '">编辑</button>';
  });
  document.querySelectorAll('[data-agent-template-id]').forEach(function (button) {
    button.onclick = function () {
      loadAgentTemplateDetail(button.dataset.agentTemplateId).catch(function (error) { alert(error.message); });
    };
  });
  if (data.list && data.list.length) {
    var preferred = agentTemplateEditorState.selectedId;
    if (!preferred) {
      var activeItem = data.list.find(function (item) { return item.status === 'active'; });
      preferred = activeItem ? activeItem.id : data.list[0].id;
    }
    await loadAgentTemplateDetail(preferred);
  }
}

async function saveAgentTemplate() {
  var id = agentTemplateEditorState.selectedId;
  if (!id) { alert('请先选择模板'); return; }
  var fields;
  try {
    fields = JSON.parse($('agentTplFieldsInput').value || '{}');
  } catch (error) {
    alert('fields JSON 格式错误');
    return;
  }
  await api('/api/admin/agent-templates/' + encodeURIComponent(id), {
    method: 'PATCH',
    body: JSON.stringify({
      name: $('agentTplNameInput').value.trim(),
      status: $('agentTplStatusInput').value,
      fields: fields,
      sample: $('agentTplSampleInput').value
    })
  });
  await renderAgentTemplates();
  alert('已保存');
}

function renderTemplateGuide() {
  $('templateGuideView').innerHTML = '<div class="guide"><p class="hint">把以下内容复制给 AI 助手（ChatGPT、Kimi、豆包等），让它按格式生成模板 JSON，粘贴到左侧"模板"页创建即可。</p><pre class="guide-content">'
    + escapeHtml(GUIDE_TEXT)
    + '</pre></div>';
}

function bindEvents() {
  $('loginBtn').onclick = function () { login().catch(function (error) { alert(error.message); }); };
  $('logoutBtn').onclick = function () {
    state.token = '';
    setHidden($('loginPanel'), false);
    setHidden($('contentPanel'), true);
    $('loginState').textContent = '未登录';
  };
  document.querySelectorAll('.nav').forEach(function (button) {
    button.onclick = function () {
      document.querySelectorAll('.nav').forEach(function (item) { item.classList.remove('active'); });
      button.classList.add('active');
      state.currentView = button.dataset.view;
      renderCurrentView().catch(function (error) { alert(error.message); });
    };
  });
}

bindEvents();
