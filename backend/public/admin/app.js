var state = {
  token: '',
  currentView: 'dashboard'
};

var viewTitles = {
  dashboard: ['总览', '后台 API 联调入口'],
  paidUsers: ['服务用户', '管理设备交付后的开通状态'],
  devices: ['设备', '查看绑定、固件和模板权限'],
  templates: ['模板', '维护通用模板和受限专业模板'],
  activationCodes: ['激活码', '导入和查看服务激活码'],
  auditLogs: ['审计日志', '查看后台关键操作记录']
};

function $(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setHidden(el, hidden) {
  el.classList.toggle('hidden', hidden);
}

function accessLabel(value) {
  return value === 'professional' ? '专业模板' : '通用模板';
}

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
  if (value === 'expired' || value === 'disabled') {
    return badge(statusLabel(value), 'badge-danger');
  }
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
  if (!response.ok || payload.code !== 'OK') {
    throw new Error(payload.message || payload.code || '请求失败');
  }
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
    var actionCell = actions ? '<td>' + actions(row) + '</td>' : '';
    return '<tr>' + cells + actionCell + '</tr>';
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
    '<div class="toolbar">',
    '<div class="inline-form">',
    '<input id="openIdentityInput" placeholder="userId / openid / 手机号">',
    '<input id="openExpiryInput" placeholder="到期时间，例如 2027-06-04">',
    '<input id="openSerialInput" placeholder="设备序列号，可选">',
    '<select id="openAccessInput">',
    '<option value="general">通用模板</option>',
    '<option value="professional">专业模板</option>',
    '</select>',
    '<button id="openUserBtn">开通</button>',
    '</div>',
    '<a class="download" href="/api/admin/exports/users.csv" target="_blank">导出 CSV</a>',
    '</div>',
    '<div id="paidUsersTable"></div>'
  ].join('');
  $('openUserBtn').onclick = openPaidUser;
  renderTable($('paidUsersTable'), [
    { key: 'phone', label: '手机号' },
    { key: 'openidMasked', label: '微信身份' },
    { key: 'memberStatus', label: '服务状态', render: function (row) { return badgeForStatus(row.memberStatus); } },
    { key: 'memberEnd', label: '到期时间' },
    { key: 'boundDevice', label: '绑定设备' },
    { key: 'templateAccess', label: '模板权限', render: function (row) { return badge(accessLabel(row.templateAccess)); } }
  ], data.list);
}

async function renderDevices() {
  var data = await api('/api/admin/devices');
  renderTable($('devicesView'), [
    { key: 'serialNo', label: '序列号' },
    { key: 'model', label: '型号' },
    { key: 'firmwareVersion', label: '固件' },
    { key: 'templateAccess', label: '模板权限', render: function (row) { return badge(accessLabel(row.templateAccess)); } },
    { key: 'bindStatus', label: '绑定状态', render: function (row) { return badgeForStatus(row.bindStatus); } },
    { key: 'boundUserPhone', label: '绑定用户' }
  ], data.list);
}

function defaultVariableJson() {
  return JSON.stringify([
    { key: 'topic', label: '主题', type: 'input', required: true, placeholder: '填写主题' },
    { key: 'content', label: '内容要点', type: 'textarea', required: true, placeholder: '填写已确认的信息' }
  ], null, 2);
}

async function renderTemplates() {
  var data = await api('/api/admin/templates');
  $('templatesView').innerHTML = [
    '<div class="split">',
    '<section class="panel form-panel">',
    '<h2>创建模板</h2>',
    '<label>模板编码<input id="tplCodeInput" placeholder="office_custom_note"></label>',
    '<label>模板名称<input id="tplNameInput" placeholder="自定义模板"></label>',
    '<label>说明<input id="tplDescInput" placeholder="一句话说明用途"></label>',
    '<label>分类<select id="tplCategoryInput">',
    '<option value="office">办公</option>',
    '<option value="report">汇报</option>',
    '<option value="email">邮件</option>',
    '<option value="notice">通知</option>',
    '</select></label>',
    '<label>可见范围<select id="tplAudienceInput">',
    '<option value="general">普通用户</option>',
    '<option value="professional">专业设备用户</option>',
    '</select></label>',
    '<label>AI 任务说明<textarea id="tplPromptInput" placeholder="只基于用户填写的信息生成正文，不编造事实。"></textarea></label>',
    '<label>字段 JSON<textarea id="tplVarsInput" class="code-input"></textarea></label>',
    '<button id="createTemplateBtn">创建模板</button>',
    '</section>',
    '<section class="panel table-panel"><div id="templatesTable"></div></section>',
    '</div>'
  ].join('');
  $('tplVarsInput').value = defaultVariableJson();
  $('createTemplateBtn').onclick = createTemplate;
  renderTable($('templatesTable'), [
    { key: 'templateCode', label: '编码' },
    { key: 'name', label: '名称' },
    { key: 'category', label: '分类' },
    { key: 'audience', label: '范围', render: function (row) { return badge(accessLabel(row.audience)); } },
    { key: 'status', label: '状态', render: function (row) { return badgeForStatus(row.status); } },
    { key: 'useCount', label: '使用次数' }
  ], data.list, function (row) {
    var nextStatus = row.status === 'published' ? 'draft' : 'published';
    var label = row.status === 'published' ? '下架' : '发布';
    return '<button class="small" data-template-id="' + escapeHtml(row.id) + '" data-status="' + nextStatus + '">' + label + '</button>';
  });
  document.querySelectorAll('[data-template-id]').forEach(function (button) {
    button.onclick = function () {
      updateTemplateStatus(button.dataset.templateId, button.dataset.status).catch(function (error) {
        alert(error.message);
      });
    };
  });
}

async function renderActivationCodes() {
  var data = await api('/api/admin/activation-codes');
  $('activationCodesView').innerHTML = [
    '<div class="toolbar">',
    '<div class="inline-form">',
    '<textarea id="codesTextInput" class="short-textarea" placeholder="每行一个激活码"></textarea>',
    '<input id="memberDaysInput" value="365" placeholder="服务天数">',
    '<button id="importCodeBtn">导入</button>',
    '</div>',
    '</div>',
    '<div id="codesTable"></div>'
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
  document.querySelectorAll('.view').forEach(function (view) {
    view.classList.add('hidden');
  });
  $(state.currentView + 'View').classList.remove('hidden');

  if (state.currentView === 'dashboard') await renderDashboard();
  if (state.currentView === 'paidUsers') await renderPaidUsers();
  if (state.currentView === 'devices') await renderDevices();
  if (state.currentView === 'templates') await renderTemplates();
  if (state.currentView === 'activationCodes') await renderActivationCodes();
  if (state.currentView === 'auditLogs') await renderAuditLogs();
}

async function login() {
  var data = await api('/api/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      account: $('accountInput').value,
      password: $('passwordInput').value
    })
  });
  state.token = data.token;
  $('loginState').textContent = data.admin.account + ' / ' + data.admin.role;
  setHidden($('loginPanel'), true);
  setHidden($('contentPanel'), false);
  await renderCurrentView();
}

async function importActivationCode() {
  var codesText = $('codesTextInput').value.trim();
  if (!codesText) {
    alert('请输入激活码');
    return;
  }
  await api('/api/admin/activation-codes/import', {
    method: 'POST',
    body: JSON.stringify({
      codesText: codesText,
      memberDays: Number($('memberDaysInput').value || 365)
    })
  });
  await renderActivationCodes();
}

async function openPaidUser() {
  var identity = $('openIdentityInput').value.trim();
  var expiryDate = $('openExpiryInput').value.trim();
  if (!identity || !expiryDate) {
    alert('请输入用户标识和到期时间');
    return;
  }
  var body = {
    expiryDate: expiryDate,
    serialNo: $('openSerialInput').value.trim(),
    templateAccess: $('openAccessInput').value
  };
  if (/^1\d{10}$/.test(identity)) {
    body.phone = identity;
  } else if (identity.indexOf('user_') === 0) {
    body.userId = identity;
  } else {
    body.openid = identity;
  }
  await api('/api/admin/paid-users', {
    method: 'POST',
    body: JSON.stringify(body)
  });
  await renderPaidUsers();
}

async function createTemplate() {
  var variableDefs;
  try {
    variableDefs = JSON.parse($('tplVarsInput').value || '[]');
  } catch (error) {
    alert('字段 JSON 格式错误');
    return;
  }
  await api('/api/admin/templates', {
    method: 'POST',
    body: JSON.stringify({
      templateCode: $('tplCodeInput').value.trim(),
      name: $('tplNameInput').value.trim(),
      description: $('tplDescInput').value.trim(),
      category: $('tplCategoryInput').value,
      audience: $('tplAudienceInput').value,
      promptContent: $('tplPromptInput').value.trim(),
      variableDefs: variableDefs
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
  $('loginBtn').onclick = function () {
    login().catch(function (error) {
      alert(error.message);
    });
  };
  $('logoutBtn').onclick = function () {
    state.token = '';
    setHidden($('loginPanel'), false);
    setHidden($('contentPanel'), true);
    $('loginState').textContent = '未登录';
  };
  document.querySelectorAll('.nav').forEach(function (button) {
    button.onclick = function () {
      document.querySelectorAll('.nav').forEach(function (item) {
        item.classList.remove('active');
      });
      button.classList.add('active');
      state.currentView = button.dataset.view;
      renderCurrentView().catch(function (error) {
        alert(error.message);
      });
    };
  });
}

bindEvents();
