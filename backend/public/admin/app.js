var state = { token: '', currentView: 'dashboard' };

var viewTitles = {
  dashboard: ['总览', '后台 API 联调入口'],
  paidUsers: ['服务用户', '管理开通状态和设备交付'],
  devices: ['设备', '预置设备、批量导入、查看绑定状态'],
  templates: ['模板', '维护通用模板和专业模板'],
  quickActions: ['快捷任务', '维护 AI 聊天的任务芯片和提示词'],
  activationCodes: ['激活码', '导入和查看服务激活码'],
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
  if (state.currentView === 'quickActions') await renderQuickActions();
  if (state.currentView === 'activationCodes') await renderActivationCodes();
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
