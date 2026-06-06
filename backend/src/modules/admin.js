const { fail, getIp, ok, parseBody, sendText } = require('../http');
const { createId, nowIso } = require('../security/ids');
const { maskPhone, paginate } = require('../security/masking');
const { writeAudit } = require('../security/audit');
const { hashPassword } = require('../security/password');
const { toCsv } = require('../security/csv');

function createAdminModule(deps) {
  var store = deps.store;
  var auth = deps.auth;

  function normalizeTemplateVariables(variableDefs) {
    if (!Array.isArray(variableDefs)) return [];
    return variableDefs.map((field) => ({
      key: String(field.key || '').trim(),
      label: String(field.label || '').trim(),
      type: field.type === 'textarea' ? 'textarea' : 'input',
      required: Boolean(field.required),
      placeholder: String(field.placeholder || '').trim()
    })).filter((field) => field.key && field.label);
  }

  function validateTemplatePayload(body, isUpdate) {
    var errors = [];
    if (!isUpdate || body.templateCode !== undefined) {
      if (!String(body.templateCode || '').trim()) errors.push('templateCode required');
      if (body.templateCode && !/^[a-zA-Z0-9_-]{3,64}$/.test(String(body.templateCode))) {
        errors.push('templateCode format invalid');
      }
    }
    if (!isUpdate || body.name !== undefined) {
      if (!String(body.name || '').trim()) errors.push('name required');
    }
    if (body.audience && ['general', 'professional'].indexOf(body.audience) === -1) {
      errors.push('audience invalid');
    }
    if (body.variableDefs !== undefined && !Array.isArray(body.variableDefs)) {
      errors.push('variableDefs must be array');
    }
    return errors;
  }

  function adminOnly(req, res) {
    return auth.requireAdmin(req, res, ['super_admin', 'operations_admin', 'customer_service_admin']);
  }

  function superAdminOnly(req, res) {
    return auth.requireAdmin(req, res, ['super_admin']);
  }

  function listPaidUsers(req, res, ctx) {
    if (!adminOnly(req, res)) return;
    var keyword = String(ctx.query.keyword || '').trim();
    var status = String(ctx.query.status || '').trim();
    var users = store.users.filter((user) => {
      if (
        keyword &&
        String(user.phone || '').indexOf(keyword) === -1 &&
        String(user.nickname || '').indexOf(keyword) === -1 &&
        String(user.openid || '').indexOf(keyword) === -1 &&
        String(user.id || '').indexOf(keyword) === -1
      ) return false;
      if (status && user.memberStatus !== status) return false;
      return true;
    }).map((user) => {
      var boundDevice = store.devices.find((device) => device.boundUserId === user.id);
      return {
        id: user.id,
        phone: maskPhone(user.phone),
        nickname: user.nickname || '',
        openidMasked: user.openid ? user.openid.slice(0, 8) + '...' : '',
        status: user.status,
        memberStatus: user.memberStatus,
        memberEnd: user.memberEnd,
        boundDevice: boundDevice ? boundDevice.serialNo : '',
        templateAccess: boundDevice ? boundDevice.templateAccess || 'general' : 'general'
      };
    });
    ok(res, paginate(users, ctx.query));
  }

  function paidUserDetail(req, res, ctx) {
    if (!adminOnly(req, res)) return;
    var user = store.users.find((item) => item.id === ctx.params.id);
    if (!user) {
      fail(res, 404, 'USER_NOT_FOUND', 'user not found');
      return;
    }
    var boundDevice = store.devices.find((device) => device.boundUserId === user.id) || null;
    ok(res, {
      id: user.id,
      phone: maskPhone(user.phone),
      nickname: user.nickname || '',
      status: user.status,
      memberStatus: user.memberStatus,
      memberStart: user.memberStart,
      memberEnd: user.memberEnd,
      disabledAt: user.disabledAt,
      disabledReason: user.disabledReason,
      lastLogin: user.lastLogin,
      registerSource: user.registerSource,
      boundDevice: boundDevice,
      templateAccess: boundDevice ? boundDevice.templateAccess || 'general' : 'general'
    });
  }

  async function createPaidUser(req, res) {
    var actor = adminOnly(req, res);
    if (!actor) return;
    var body = await parseBody(req);
    var phone = String(body.phone || '').trim();
    var openid = String(body.openid || '').trim();
    var userId = String(body.userId || '').trim();
    if (phone && !/^1\d{10}$/.test(phone)) {
      fail(res, 400, 'INVALID_PHONE', 'invalid phone');
      return;
    }
    var now = nowIso();
    var user = store.users.find((item) => {
      return (phone && item.phone === phone) ||
        (openid && item.openid === openid) ||
        (userId && item.id === userId);
    });
    if (!user && !phone && !openid) {
      fail(res, 400, 'USER_IDENTITY_REQUIRED', 'phone, openid, or userId required');
      return;
    }
    if (!user) {
      user = {
        id: createId('user'),
        openid: openid,
        unionid: String(body.unionid || ''),
        phone: phone,
        nickname: '',
        status: 'active',
        memberStatus: 'active',
        memberStart: now,
        memberEnd: body.expiryDate || '',
        disabledAt: '',
        disabledReason: '',
        lastLogin: '',
        registerSource: 'admin_created',
        createdAt: now,
        updatedAt: now
      };
      store.users.push(user);
    } else {
      user.memberStatus = 'active';
      user.memberEnd = body.expiryDate || user.memberEnd;
      user.updatedAt = now;
    }
    if (body.serialNo) {
      var nextTemplateAccess = body.templateAccess === 'professional' ? 'professional' : 'general';
      var device = store.devices.find((item) => item.serialNo === body.serialNo);
      if (!device) {
        device = {
          id: createId('device'),
          mac: '',
          serialNo: body.serialNo,
          model: '',
          firmwareVersion: '',
          protocolVersion: '',
          templateAccess: nextTemplateAccess,
          bindStatus: 'reserved',
          boundUserId: '',
          boundAt: '',
          createdAt: now,
          updatedAt: now
        };
        store.devices.push(device);
      } else {
        device.templateAccess = nextTemplateAccess;
        device.updatedAt = now;
      }
    }
    writeAudit(store, {
      actor: actor,
      ip: getIp(req),
      module: 'paid_user',
      actionType: 'create_or_open',
      targetId: user.id,
      afterJson: { phone: maskPhone(user.phone), openid: user.openid ? 'provided' : '', memberEnd: user.memberEnd }
    });
    ok(res, {
      id: user.id,
      phone: maskPhone(user.phone),
      openidMasked: user.openid ? user.openid.slice(0, 8) + '...' : '',
      status: user.memberStatus,
      expiryDate: user.memberEnd,
      serialNo: body.serialNo || '',
      templateAccess: body.templateAccess === 'professional' ? 'professional' : 'general'
    });
  }

  async function updatePaidUser(req, res, ctx) {
    var actor = adminOnly(req, res);
    if (!actor) return;
    var body = await parseBody(req);
    var user = store.users.find((item) => item.id === ctx.params.id);
    if (!user) {
      fail(res, 404, 'USER_NOT_FOUND', 'user not found');
      return;
    }
    var before = {
      status: user.status,
      memberStatus: user.memberStatus,
      memberEnd: user.memberEnd
    };
    if (body.status) user.memberStatus = body.status;
    if (body.expiryDate) user.memberEnd = body.expiryDate;
    if (body.disabledReason !== undefined) user.disabledReason = body.disabledReason;
    if (body.templateAccess) {
      var boundDevice = store.devices.find((device) => device.boundUserId === user.id);
      if (boundDevice) {
        boundDevice.templateAccess = body.templateAccess === 'professional' ? 'professional' : 'general';
        boundDevice.updatedAt = nowIso();
      }
    }
    user.updatedAt = nowIso();
    writeAudit(store, {
      actor: actor,
      ip: getIp(req),
      module: 'paid_user',
      actionType: 'update',
      targetId: user.id,
      beforeJson: before,
      afterJson: {
        status: user.status,
        memberStatus: user.memberStatus,
        memberEnd: user.memberEnd
      }
    });
    var responseDevice = store.devices.find((device) => device.boundUserId === user.id);
    ok(res, {
      id: user.id,
      phone: maskPhone(user.phone),
      memberStatus: user.memberStatus,
      memberEnd: user.memberEnd,
      templateAccess: responseDevice ? responseDevice.templateAccess || 'general' : 'general'
    });
  }

  function listDevices(req, res, ctx) {
    if (!adminOnly(req, res)) return;
    var keyword = String(ctx.query.keyword || '').trim();
    var devices = store.devices.filter((device) => {
      if (!keyword) return true;
      return String(device.serialNo || '').indexOf(keyword) !== -1 || String(device.mac || '').indexOf(keyword) !== -1;
    }).map((device) => {
      var user = store.users.find((item) => item.id === device.boundUserId);
      return Object.assign({}, device, {
        boundUserPhone: user ? maskPhone(user.phone) : ''
      });
    });
    ok(res, paginate(devices, ctx.query));
  }

  function dashboard(req, res) {
    if (!adminOnly(req, res)) return;
    var activeUsers = store.users.filter((item) => item.memberStatus === 'active').length;
    var boundDevices = store.devices.filter((item) => item.bindStatus === 'bound').length;
    var pendingFeedbacks = store.feedbacks.filter((item) => item.status === 'pending').length;
    var unusedCodes = store.activationCodes.filter((item) => item.status === 'unused').length;
    ok(res, {
      totalUsers: store.users.length,
      activeUsers: activeUsers,
      totalDevices: store.devices.length,
      boundDevices: boundDevices,
      totalOrders: store.orders.length,
      pendingFeedbacks: pendingFeedbacks,
      unusedActivationCodes: unusedCodes,
      auditLogCount: store.auditLogs.length
    });
  }

  async function forceUnbindDevice(req, res, ctx) {
    var actor = adminOnly(req, res);
    if (!actor) return;
    var device = store.devices.find((item) => item.id === ctx.params.id);
    if (!device) {
      fail(res, 404, 'DEVICE_NOT_FOUND', 'device not found');
      return;
    }
    var body = await parseBody(req);
    var before = {
      bindStatus: device.bindStatus,
      boundUserId: device.boundUserId
    };
    device.bindStatus = 'unbound';
    device.boundUserId = '';
    device.boundAt = '';
    device.updatedAt = nowIso();
    writeAudit(store, {
      actor: actor,
      ip: getIp(req),
      module: 'device',
      actionType: 'force_unbind',
      targetId: device.id,
      beforeJson: before,
      afterJson: { bindStatus: device.bindStatus },
      detail: String(body.reason || '')
    });
    ok(res, device);
  }

  function listOrders(req, res, ctx) {
    if (!adminOnly(req, res)) return;
    var orders = store.orders.map((order) => {
      var user = store.users.find((item) => item.id === order.userId);
      return Object.assign({}, order, {
        userPhone: user ? maskPhone(user.phone) : ''
      });
    });
    ok(res, paginate(orders, ctx.query));
  }

  function orderDetail(req, res, ctx) {
    if (!adminOnly(req, res)) return;
    var order = store.orders.find((item) => item.id === ctx.params.id || item.orderNo === ctx.params.id);
    if (!order) {
      fail(res, 404, 'ORDER_NOT_FOUND', 'order not found');
      return;
    }
    var user = store.users.find((item) => item.id === order.userId);
    ok(res, Object.assign({}, order, {
      userPhone: user ? maskPhone(user.phone) : ''
    }));
  }

  async function changeOrderStatus(req, res, ctx, nextStatus, actionType) {
    var actor = adminOnly(req, res);
    if (!actor) return;
    var body = await parseBody(req);
    var order = store.orders.find((item) => item.id === ctx.params.id || item.orderNo === ctx.params.id);
    if (!order) {
      fail(res, 404, 'ORDER_NOT_FOUND', 'order not found');
      return;
    }
    var before = { status: order.status };
    order.status = nextStatus;
    if (nextStatus === 'cancelled') order.cancelAt = nowIso();
    if (nextStatus === 'refunded') order.refundAt = nowIso();
    writeAudit(store, {
      actor: actor,
      ip: getIp(req),
      module: 'order',
      actionType: actionType,
      targetId: order.id,
      beforeJson: before,
      afterJson: { status: order.status },
      detail: String(body.reason || '')
    });
    ok(res, order);
  }

  function cancelOrder(req, res, ctx) {
    return changeOrderStatus(req, res, ctx, 'cancelled', 'cancel');
  }

  function refundOrder(req, res, ctx) {
    return changeOrderStatus(req, res, ctx, 'refunded', 'refund');
  }

  function listServiceRecords(req, res, ctx) {
    if (!adminOnly(req, res)) return;
    var records = store.users.map((user) => ({
      id: 'svc_' + user.id,
      userId: user.id,
      phone: maskPhone(user.phone),
      status: user.memberStatus,
      startedAt: user.memberStart,
      expiredAt: user.memberEnd,
      source: user.registerSource || ''
    }));
    ok(res, paginate(records, ctx.query));
  }

  function listActivationCodes(req, res, ctx) {
    if (!adminOnly(req, res)) return;
    var status = String(ctx.query.status || '').trim();
    var items = store.activationCodes.filter((item) => {
      return !status || item.status === status;
    }).map((item) => ({
      id: item.id,
      codeMasked: item.code.slice(0, 4) + '****' + item.code.slice(-2),
      status: item.status,
      memberDays: item.memberDays,
      usedBy: item.usedBy ? maskPhone(item.usedBy) : '',
      usedAt: item.usedAt,
      createdAt: item.createdAt
    }));
    ok(res, paginate(items, ctx.query));
  }

  async function importActivationCodes(req, res) {
    var actor = adminOnly(req, res);
    if (!actor) return;
    var body = await parseBody(req);
    var rawText = String(body.codesText || body.codes || '');
    var codes = rawText.split(/\s+/).map((item) => item.trim()).filter(Boolean);
    if (!codes.length) {
      fail(res, 400, 'ACTIVATION_CODES_REQUIRED', 'activation codes required');
      return;
    }
    var now = nowIso();
    var created = [];
    codes.forEach((code) => {
      if (store.activationCodes.some((item) => item.code === code)) return;
      var item = {
        id: createId('act'),
        code: code,
        status: 'unused',
        memberDays: Number(body.memberDays || 365),
        usedBy: '',
        usedAt: '',
        createdAt: now
      };
      store.activationCodes.push(item);
      created.push({
        id: item.id,
        codeMasked: item.code.slice(0, 4) + '****' + item.code.slice(-2),
        status: item.status
      });
    });
    writeAudit(store, {
      actor: actor,
      ip: getIp(req),
      module: 'activation_code',
      actionType: 'import',
      targetId: '',
      afterJson: { count: created.length }
    });
    ok(res, {
      importedCount: created.length,
      items: created
    });
  }

  function listTokenUsage(req, res, ctx) {
    if (!adminOnly(req, res)) return;
    var items = store.tokenUsageRecords.map((record) => {
      var user = store.users.find((item) => item.id === record.userId);
      return Object.assign({}, record, {
        userPhone: user ? maskPhone(user.phone) : ''
      });
    });
    ok(res, paginate(items, ctx.query));
  }

  function listTemplates(req, res, ctx) {
    if (!adminOnly(req, res)) return;
    ok(res, paginate(store.templates, ctx.query));
  }

  function templateDetail(req, res, ctx) {
    if (!adminOnly(req, res)) return;
    var item = store.templates.find((template) => template.id === ctx.params.id || template.templateCode === ctx.params.id);
    if (!item) {
      fail(res, 404, 'TEMPLATE_NOT_FOUND', 'template not found');
      return;
    }
    ok(res, item);
  }

  async function createTemplate(req, res) {
    var actor = adminOnly(req, res);
    if (!actor) return;
    var body = await parseBody(req);
    var errors = validateTemplatePayload(body, false);
    if (errors.length) {
      fail(res, 400, 'TEMPLATE_INVALID', errors.join('; '));
      return;
    }
    if (store.templates.some((template) => template.templateCode === String(body.templateCode))) {
      fail(res, 409, 'TEMPLATE_CODE_EXISTS', 'templateCode already exists');
      return;
    }
    var now = nowIso();
    var item = {
      id: createId('tpl'),
      templateCode: String(body.templateCode),
      name: String(body.name),
      description: String(body.description || ''),
      category: String(body.category || ''),
      audience: body.audience === 'professional' ? 'professional' : 'general',
      department: String(body.department || ''),
      scene: String(body.scene || ''),
      type: String(body.type || ''),
      creatorId: actor.id,
      promptContent: String(body.promptContent || ''),
      variableDefs: normalizeTemplateVariables(body.variableDefs),
      status: 'draft',
      useCount: 0,
      createdAt: now,
      updatedAt: now
    };
    store.templates.push(item);
    writeAudit(store, {
      actor: actor,
      ip: getIp(req),
      module: 'template',
      actionType: 'create',
      targetId: item.id
    });
    ok(res, item);
  }

  async function updateTemplate(req, res, ctx) {
    var actor = adminOnly(req, res);
    if (!actor) return;
    var body = await parseBody(req);
    var item = store.templates.find((template) => template.id === ctx.params.id || template.templateCode === ctx.params.id);
    if (!item) {
      fail(res, 404, 'TEMPLATE_NOT_FOUND', 'template not found');
      return;
    }
    var errors = validateTemplatePayload(body, true);
    if (errors.length) {
      fail(res, 400, 'TEMPLATE_INVALID', errors.join('; '));
      return;
    }
    var before = Object.assign({}, item);
    ['name', 'description', 'category', 'audience', 'department', 'scene', 'type', 'promptContent', 'status'].forEach((key) => {
      if (body[key] !== undefined) item[key] = body[key];
    });
    if (item.audience !== 'professional') item.audience = 'general';
    if (body.variableDefs !== undefined) item.variableDefs = normalizeTemplateVariables(body.variableDefs);
    item.updatedAt = nowIso();
    writeAudit(store, {
      actor: actor,
      ip: getIp(req),
      module: 'template',
      actionType: 'update',
      targetId: item.id,
      beforeJson: before,
      afterJson: item
    });
    ok(res, item);
  }

  function listFeedbacks(req, res, ctx) {
    if (!adminOnly(req, res)) return;
    ok(res, paginate(store.feedbacks, ctx.query));
  }

  async function updateFeedback(req, res, ctx) {
    var actor = adminOnly(req, res);
    if (!actor) return;
    var body = await parseBody(req);
    var item = store.feedbacks.find((feedback) => feedback.id === ctx.params.id);
    if (!item) {
      fail(res, 404, 'FEEDBACK_NOT_FOUND', 'feedback not found');
      return;
    }
    var before = { status: item.status };
    item.status = body.status || item.status;
    item.reviewRemarkLength = String(body.reviewRemark || '').length;
    item.reviewedAt = nowIso();
    writeAudit(store, {
      actor: actor,
      ip: getIp(req),
      module: 'feedback',
      actionType: 'review',
      targetId: item.id,
      beforeJson: before,
      afterJson: { status: item.status }
    });
    ok(res, item);
  }

  function listAdminUsers(req, res, ctx) {
    if (!superAdminOnly(req, res)) return;
    ok(res, paginate(store.adminUsers.map((item) => ({
      id: item.id,
      account: item.account,
      role: item.role,
      status: item.status,
      failedLoginCount: item.failedLoginCount,
      lockedUntil: item.lockedUntil,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    })), ctx.query));
  }

  async function createAdminUser(req, res) {
    var actor = superAdminOnly(req, res);
    if (!actor) return;
    var body = await parseBody(req);
    var account = String(body.account || '').trim();
    if (!account || !body.password) {
      fail(res, 400, 'ADMIN_ACCOUNT_REQUIRED', 'account and password required');
      return;
    }
    if (store.adminUsers.some((item) => item.account === account)) {
      fail(res, 409, 'ADMIN_ACCOUNT_EXISTS', 'admin account exists');
      return;
    }
    var now = nowIso();
    var item = {
      id: createId('admin'),
      account: account,
      passwordHash: hashPassword(body.password),
      role: body.role || 'customer_service_admin',
      status: 'active',
      failedLoginCount: 0,
      lockedUntil: '',
      createdAt: now,
      updatedAt: now
    };
    store.adminUsers.push(item);
    writeAudit(store, {
      actor: actor,
      ip: getIp(req),
      module: 'admin_user',
      actionType: 'create',
      targetId: item.id
    });
    ok(res, {
      id: item.id,
      account: item.account,
      role: item.role,
      status: item.status
    });
  }

  async function updateAdminUser(req, res, ctx) {
    var actor = superAdminOnly(req, res);
    if (!actor) return;
    var body = await parseBody(req);
    var item = store.adminUsers.find((adminUser) => adminUser.id === ctx.params.id);
    if (!item) {
      fail(res, 404, 'ADMIN_NOT_FOUND', 'admin not found');
      return;
    }
    var before = {
      role: item.role,
      status: item.status
    };
    if (body.role) item.role = body.role;
    if (body.status) item.status = body.status;
    if (body.password) item.passwordHash = hashPassword(body.password);
    item.updatedAt = nowIso();
    writeAudit(store, {
      actor: actor,
      ip: getIp(req),
      module: 'admin_user',
      actionType: 'update',
      targetId: item.id,
      beforeJson: before,
      afterJson: { role: item.role, status: item.status }
    });
    ok(res, {
      id: item.id,
      account: item.account,
      role: item.role,
      status: item.status
    });
  }

  function listAuditLogs(req, res, ctx) {
    if (!adminOnly(req, res)) return;
    ok(res, paginate(store.auditLogs, ctx.query));
  }

  function exportUsers(req, res) {
    if (!adminOnly(req, res)) return;
    var rows = store.users.slice(0, 10000).map((user) => ({
      id: user.id,
      phone: maskPhone(user.phone),
      nickname: user.nickname || '',
      status: user.status,
      memberStatus: user.memberStatus,
      memberEnd: user.memberEnd,
      registerSource: user.registerSource,
      lastLogin: user.lastLogin
    }));
    sendText(res, 200, toCsv([
      { key: 'id', label: '用户ID' },
      { key: 'phone', label: '手机号' },
      { key: 'nickname', label: '昵称' },
      { key: 'status', label: '账号状态' },
      { key: 'memberStatus', label: '服务状态' },
      { key: 'memberEnd', label: '到期时间' },
      { key: 'registerSource', label: '来源' },
      { key: 'lastLogin', label: '最后登录' }
    ], rows), {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="users.csv"'
    });
  }

  function exportAuditLogs(req, res) {
    if (!adminOnly(req, res)) return;
    var rows = store.auditLogs.slice(0, 10000);
    sendText(res, 200, toCsv([
      { key: 'operatorAccount', label: '操作人' },
      { key: 'ip', label: 'IP' },
      { key: 'module', label: '模块' },
      { key: 'actionType', label: '动作' },
      { key: 'targetId', label: '目标' },
      { key: 'result', label: '结果' },
      { key: 'createdAt', label: '时间' }
    ], rows), {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="audit-logs.csv"'
    });
  }

  return {
    createPaidUser,
    createAdminUser,
    createTemplate,
    cancelOrder,
    dashboard,
    exportAuditLogs,
    exportUsers,
    forceUnbindDevice,
    importActivationCodes,
    listActivationCodes,
    listAdminUsers,
    listAuditLogs,
    listDevices,
    listFeedbacks,
    listOrders,
    listPaidUsers,
    listServiceRecords,
    listTemplates,
    listTokenUsage,
    orderDetail,
    paidUserDetail,
    refundOrder,
    templateDetail,
    updateAdminUser,
    updateFeedback,
    updatePaidUser,
    updateTemplate
  };
}

module.exports = {
  createAdminModule
};
