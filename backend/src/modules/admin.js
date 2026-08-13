const { fail, getIp, ok, parseBody, sendText } = require('../http');
const { createId, nowIso } = require('../security/ids');
const { maskPhone, paginate } = require('../security/masking');
const { writeAudit } = require('../security/audit');
const { hashPassword } = require('../security/password');
const { parseCsvText, toCsv } = require('../security/csv');
const { publicDevice } = require('./auth');
const { ensureAgentTemplates } = require('./templates');

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

  function normalizeDevicePayload(body) {
    return {
      serialNo: String(body.serialNo || body.serial_no || body['序列号'] || '').trim(),
      proofCode: String(body.proofCode || body.proof_code || body['校验码'] || '').trim(),
      reservedUserId: String(body.reservedUserId || body.reserved_user_id || body.userId || body.user_id || body['预留用户ID'] || '').trim(),
      mac: String(body.mac || body.MAC || '').trim(),
      model: String(body.model || body['型号'] || '').trim(),
      firmwareVersion: String(body.firmwareVersion || body.firmware_version || body['固件版本'] || '').trim(),
      protocolVersion: String(body.protocolVersion || body.protocol_version || body['协议版本'] || '').trim()
    };
  }

  function validateDevicePayload(input) {
    var errors = [];
    if (!input.serialNo) errors.push('serialNo required');
    if (input.serialNo && !/^[a-zA-Z0-9_-]{3,128}$/.test(input.serialNo)) errors.push('serialNo format invalid');
    if (input.reservedUserId && !store.users.some((item) => item.id === input.reservedUserId)) {
      errors.push('reserved user not found');
    }
    return errors;
  }

  function upsertDevice(input, now) {
    var proofCode = input.proofCode;
    var device = store.devices.find((item) => item.serialNo === input.serialNo);
    var created = false;
    if (!device) {
      created = true;
      device = {
        id: createId('device'),
        mac: input.mac,
        serialNo: input.serialNo,
        model: input.model,
        firmwareVersion: input.firmwareVersion,
        protocolVersion: input.protocolVersion,
        proofCodeHash: proofCode ? hashPassword(proofCode) : '',
        bindStatus: input.reservedUserId ? 'reserved' : 'unbound',
        reservedUserId: input.reservedUserId,
        boundUserId: '',
        boundAt: '',
        createdAt: now,
        updatedAt: now
      };
      store.devices.push(device);
    } else {
      if (device.bindStatus === 'bound' && input.reservedUserId && device.boundUserId !== input.reservedUserId) {
        throw new Error('DEVICE_ALREADY_BOUND');
      }
      ['mac', 'model', 'firmwareVersion', 'protocolVersion'].forEach((key) => {
        if (input[key] !== undefined && input[key] !== '') device[key] = input[key];
      });
      if (proofCode) device.proofCodeHash = hashPassword(proofCode);
      if (device.bindStatus !== 'bound') {
        device.bindStatus = input.reservedUserId ? 'reserved' : 'unbound';
        device.reservedUserId = input.reservedUserId;
      }
      device.updatedAt = now;
    }
    return {
      created: created,
      device: device
    };
  }

  function adminOnly(req, res) {
    return auth.requireAdmin(req, res, ['super_admin', 'operations_admin', 'customer_service_admin']);
  }

  function superAdminOnly(req, res) {
    return auth.requireAdmin(req, res, ['super_admin']);
  }

  function withGuard(fn) {
    return function (req, res, ctx) {
      var actor = adminOnly(req, res);
      if (!actor) return;
      return fn(req, res, Object.assign({}, ctx, { actor: actor }));
    };
  }

  function withSuperGuard(fn) {
    return function (req, res, ctx) {
      var actor = superAdminOnly(req, res);
      if (!actor) return;
      return fn(req, res, Object.assign({}, ctx, { actor: actor }));
    };
  }

  function listPaidUsers(req, res, ctx) {
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
      var boundDevice = store.devices.find((device) => device.boundUserId === user.id && device.bindStatus === 'bound');
      return {
        id: user.id,
        phone: maskPhone(user.phone),
        nickname: user.nickname || '',
        openidMasked: user.openid ? user.openid.slice(0, 8) + '...' : '',
        status: user.status,
        memberStatus: user.memberStatus,
        memberEnd: user.memberEnd,
        boundDevice: boundDevice ? boundDevice.serialNo : ''
      };
    });
    ok(res, paginate(users, ctx.query));
  }

  function paidUserDetail(req, res, ctx) {
    var user = store.users.find((item) => item.id === ctx.params.id);
    if (!user) {
      fail(res, 404, 'USER_NOT_FOUND', 'user not found');
      return;
    }
    var boundDevice = store.devices.find((device) => device.boundUserId === user.id && device.bindStatus === 'bound') || null;
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
      boundDevice: publicDevice(boundDevice)
    });
  }

  async function createPaidUser(req, res, ctx) {
    var actor = ctx.actor;
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
        features: { transferDemo: Boolean(body.transferDemo) },
        createdAt: now,
        updatedAt: now
      };
      store.users.push(user);
    } else {
      user.memberStatus = 'active';
      user.memberEnd = body.expiryDate || user.memberEnd;
      if (body.transferDemo !== undefined) {
        user.features = Object.assign({}, user.features || {}, {
          transferDemo: Boolean(body.transferDemo)
        });
      }
      user.updatedAt = now;
    }
    if (body.serialNo) {
      var proofCode = String(body.proofCode || '').trim();
      var device = store.devices.find((item) => item.serialNo === body.serialNo);
      if (!device) {
        device = {
          id: createId('device'),
          mac: '',
          serialNo: body.serialNo,
          model: '',
          firmwareVersion: '',
          protocolVersion: '',
          proofCodeHash: proofCode ? hashPassword(proofCode) : '',
          bindStatus: 'reserved',
          reservedUserId: user.id,
          boundUserId: '',
          boundAt: '',
          createdAt: now,
          updatedAt: now
        };
        store.devices.push(device);
      } else {
        if (proofCode) device.proofCodeHash = hashPassword(proofCode);
        if (device.bindStatus !== 'bound') {
          device.bindStatus = 'reserved';
          device.reservedUserId = user.id;
        }
        device.updatedAt = now;
      }
    }
    writeAudit(store, {
      actor: actor,
      ip: getIp(req),
      module: 'paid_user',
      actionType: 'create_or_open',
      targetId: user.id,
      afterJson: {
        phone: maskPhone(user.phone),
        openid: user.openid ? 'provided' : '',
        memberEnd: user.memberEnd,
        serialNo: body.serialNo || '',
        hasProofCode: Boolean(body.proofCode),
        transferDemo: Boolean(user.features && user.features.transferDemo)
      }
    });
    ok(res, {
      id: user.id,
      phone: maskPhone(user.phone),
      openidMasked: user.openid ? user.openid.slice(0, 8) + '...' : '',
      status: user.memberStatus,
      expiryDate: user.memberEnd,
      serialNo: body.serialNo || '',
      transferDemo: Boolean(user.features && user.features.transferDemo)
    });
  }

  async function updatePaidUser(req, res, ctx) {
    var actor = ctx.actor;
    var body = await parseBody(req);
    var user = store.users.find((item) => item.id === ctx.params.id);
    if (!user) {
      fail(res, 404, 'USER_NOT_FOUND', 'user not found');
      return;
    }
    var before = {
      status: user.status,
      memberStatus: user.memberStatus,
      memberEnd: user.memberEnd,
      transferDemo: Boolean(user.features && user.features.transferDemo)
    };
    if (body.status) user.memberStatus = body.status;
    if (body.expiryDate) user.memberEnd = body.expiryDate;
    if (body.disabledReason !== undefined) user.disabledReason = body.disabledReason;
    if (body.transferDemo !== undefined) {
      user.features = Object.assign({}, user.features || {}, {
        transferDemo: Boolean(body.transferDemo)
      });
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
        memberEnd: user.memberEnd,
        transferDemo: Boolean(user.features && user.features.transferDemo)
      }
    });
    ok(res, {
      id: user.id,
      phone: maskPhone(user.phone),
      memberStatus: user.memberStatus,
      memberEnd: user.memberEnd,
      transferDemo: Boolean(user.features && user.features.transferDemo)
    });
  }

  function listDevices(req, res, ctx) {
 var keyword = String(ctx.query.keyword || '').trim();
    var devices = store.devices.filter((device) => {
      if (!keyword) return true;
      return String(device.serialNo || '').indexOf(keyword) !== -1 || String(device.mac || '').indexOf(keyword) !== -1;
    }).map((device) => {
      var user = store.users.find((item) => item.id === device.boundUserId);
      return Object.assign(publicDevice(device), {
        boundUserPhone: user ? maskPhone(user.phone) : ''
      });
    });
    ok(res, paginate(devices, ctx.query));
  }

  async function createDevice(req, res, ctx) {
    var actor = ctx.actor;
    var body = await parseBody(req);
    var input = normalizeDevicePayload(body);
    var errors = validateDevicePayload(input);
    if (errors.length) {
      fail(res, 400, 'DEVICE_INVALID', errors.join('; '));
      return;
    }
    var now = nowIso();
    var result;
    try {
      result = upsertDevice(input, now);
    } catch (error) {
      if (error.message === 'DEVICE_ALREADY_BOUND') {
        fail(res, 409, 'DEVICE_ALREADY_BOUND', 'device already bound');
        return;
      }
      throw error;
    }
    writeAudit(store, {
      actor: actor,
      ip: getIp(req),
      module: 'device',
      actionType: 'create_or_update',
      targetId: result.device.id,
      afterJson: {
        serialNo: input.serialNo,
        bindStatus: result.device.bindStatus,
        reservedUserId: input.reservedUserId ? 'provided' : '',
        hasProofCode: Boolean(input.proofCode || result.device.proofCodeHash)
      }
    });
    ok(res, publicDevice(result.device));
  }

  async function importDevices(req, res, ctx) {
    var actor = ctx.actor;
    var body = await parseBody(req);
    var rawRows = Array.isArray(body.devices) ? body.devices : parseCsvText(body.devicesText || body.csv || '');
    if (!rawRows.length) {
      fail(res, 400, 'DEVICES_REQUIRED', 'devices or devicesText required');
      return;
    }
    if (rawRows.length > 500) {
      fail(res, 413, 'TOO_MANY_DEVICES', 'at most 500 devices per import');
      return;
    }
    var now = nowIso();
    var imported = [];
    var errors = [];
    rawRows.forEach((row, index) => {
      var input = normalizeDevicePayload(row);
      var rowNumber = row.rowNumber || index + 1;
      var validation = validateDevicePayload(input);
      if (validation.length) {
        errors.push({ rowNumber: rowNumber, serialNo: input.serialNo, error: validation.join('; ') });
        return;
      }
      try {
        var result = upsertDevice(input, now);
        imported.push({
          rowNumber: rowNumber,
          id: result.device.id,
          serialNo: result.device.serialNo,
          created: result.created,
          bindStatus: result.device.bindStatus,
          hasProofCode: Boolean(result.device.proofCodeHash)
        });
      } catch (error) {
        errors.push({ rowNumber: rowNumber, serialNo: input.serialNo, error: error.message });
      }
    });
    writeAudit(store, {
      actor: actor,
      ip: getIp(req),
      module: 'device',
      actionType: 'import',
      targetId: '',
      afterJson: {
        importedCount: imported.length,
        errorCount: errors.length
      }
    });
    ok(res, {
      importedCount: imported.length,
      errorCount: errors.length,
      imported: imported,
      errors: errors
    });
  }

  function dashboard(req, res) {
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
    var actor = ctx.actor;
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
    ok(res, publicDevice(device));
  }

  function listOrders(req, res, ctx) {
 var orders = store.orders.map((order) => {
      var user = store.users.find((item) => item.id === order.userId);
      return Object.assign({}, order, {
        userPhone: user ? maskPhone(user.phone) : ''
      });
    });
    ok(res, paginate(orders, ctx.query));
  }

  function orderDetail(req, res, ctx) {
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
    var actor = ctx.actor;
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

  async function importActivationCodes(req, res, ctx) {
    var actor = ctx.actor;
    var body = await parseBody(req);
    var rawInput = body.codesText || body.codes || '';
    var rawText = Array.isArray(rawInput) ? rawInput.join('\n') : String(rawInput);
    var codes = rawText.split(/[\s,]+/).map((item) => item.trim()).filter(Boolean);
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
 var items = store.tokenUsageRecords.map((record) => {
      var user = store.users.find((item) => item.id === record.userId);
      return Object.assign({}, record, {
        userPhone: user ? maskPhone(user.phone) : ''
      });
    });
    ok(res, paginate(items, ctx.query));
  }

  function listTemplates(req, res, ctx) {
 ok(res, paginate(store.templates, ctx.query));
  }

  function templateDetail(req, res, ctx) {
 var item = store.templates.find((template) => template.id === ctx.params.id || template.templateCode === ctx.params.id);
    if (!item) {
      fail(res, 404, 'TEMPLATE_NOT_FOUND', 'template not found');
      return;
    }
    ok(res, item);
  }

  async function createTemplate(req, res, ctx) {
    var actor = ctx.actor;
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
      outputStructure: Array.isArray(body.outputStructure) ? body.outputStructure : [],
      qualityRules: Array.isArray(body.qualityRules) ? body.qualityRules : [],
      missingInfoRules: Array.isArray(body.missingInfoRules) ? body.missingInfoRules : [],
      forbiddenRules: Array.isArray(body.forbiddenRules) ? body.forbiddenRules : [],
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
    var actor = ctx.actor;
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
    if (Array.isArray(body.outputStructure)) item.outputStructure = body.outputStructure;
    if (Array.isArray(body.qualityRules)) item.qualityRules = body.qualityRules;
    if (Array.isArray(body.missingInfoRules)) item.missingInfoRules = body.missingInfoRules;
    if (Array.isArray(body.forbiddenRules)) item.forbiddenRules = body.forbiddenRules;
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

  function listQuickActions(req, res) {
 ok(res, paginate(store.quickActions, {}));
  }

  async function createQuickAction(req, res, ctx) {
    var actor = ctx.actor;
    var body = await parseBody(req);
    if (!body.actionCode || !body.title) {
      fail(res, 400, 'QUICKACTION_INVALID', 'actionCode and title required');
      return;
    }
    if (store.quickActions.some((qa) => qa.actionCode === String(body.actionCode))) {
      fail(res, 409, 'QUICKACTION_CODE_EXISTS', 'actionCode already exists');
      return;
    }
    var now = nowIso();
    var item = {
      id: createId('qa'),
      actionCode: String(body.actionCode),
      title: String(body.title),
      description: String(body.description || ''),
      category: String(body.category || ''),
      audience: body.audience === 'professional' ? 'professional' : 'general',
      placeholder: String(body.placeholder || ''),
      promptContent: String(body.promptContent || ''),
      outputStructure: Array.isArray(body.outputStructure) ? body.outputStructure : [],
      qualityRules: Array.isArray(body.qualityRules) ? body.qualityRules : [],
      missingInfoRules: Array.isArray(body.missingInfoRules) ? body.missingInfoRules : [],
      forbiddenRules: Array.isArray(body.forbiddenRules) ? body.forbiddenRules : [],
      sortOrder: Number(body.sortOrder || 0),
      status: 'published',
      createdAt: now,
      updatedAt: now
    };
    store.quickActions.push(item);
    writeAudit(store, {
      actor: actor,
      ip: getIp(req),
      module: 'quickAction',
      actionType: 'create',
      targetId: item.id
    });
    ok(res, item);
  }

  async function updateQuickAction(req, res, ctx) {
    var actor = ctx.actor;
    var body = await parseBody(req);
    var item = store.quickActions.find((qa) => qa.id === ctx.params.id);
    if (!item) {
      fail(res, 404, 'QUICKACTION_NOT_FOUND', 'quick action not found');
      return;
    }
    ['title', 'description', 'category', 'audience', 'placeholder', 'promptContent', 'status'].forEach((key) => {
      if (body[key] !== undefined) item[key] = body[key];
    });
    if (item.audience !== 'professional') item.audience = 'general';
    if (body.sortOrder !== undefined) item.sortOrder = Number(body.sortOrder);
    if (Array.isArray(body.outputStructure)) item.outputStructure = body.outputStructure;
    if (Array.isArray(body.qualityRules)) item.qualityRules = body.qualityRules;
    if (Array.isArray(body.missingInfoRules)) item.missingInfoRules = body.missingInfoRules;
    if (Array.isArray(body.forbiddenRules)) item.forbiddenRules = body.forbiddenRules;
    item.updatedAt = nowIso();
    writeAudit(store, {
      actor: actor,
      ip: getIp(req),
      module: 'quickAction',
      actionType: 'update',
      targetId: item.id
    });
    ok(res, item);
  }

  function listFeedbacks(req, res, ctx) {
 ok(res, paginate(store.feedbacks, ctx.query));
  }

  async function updateFeedback(req, res, ctx) {
    var actor = ctx.actor;
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

  async function createAdminUser(req, res, ctx) {
    var actor = ctx.actor;
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
    var actor = ctx.actor;
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
 ok(res, paginate(store.auditLogs, ctx.query));
  }

  function exportUsers(req, res) {
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

  function exportDeviceImportTemplate(req, res) {
 sendText(res, 200, toCsv([
      { key: 'serialNo', label: 'serialNo' },
      { key: 'proofCode', label: 'proofCode' },
      { key: 'reservedUserId', label: 'reservedUserId' },
      { key: 'model', label: 'model' },
      { key: 'firmwareVersion', label: 'firmwareVersion' },
      { key: 'protocolVersion', label: 'protocolVersion' }
    ], [{
      serialNo: 'TXT-HID-001',
      proofCode: '2468',
      reservedUserId: '',
      model: 'TXT-HID',
      firmwareVersion: '1.0',
      protocolVersion: 'locked'
    }]), {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="device-import-template.csv"'
    });
  }

  function parseAgentTemplateFields(value) {
    if (value === undefined) return undefined;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        throw new Error('INVALID_JSON');
      }
    }
    return value;
  }

  function listAgentTemplates(req, res, ctx) {
    ensureAgentTemplates(store);
    var items = store.agentTemplates.filter(function (item) {
      return item.tag === 'official';
    });
    ok(res, paginate(items, ctx.query));
  }

  function agentTemplateDetail(req, res, ctx) {
    ensureAgentTemplates(store);
    var item = store.agentTemplates.find(function (tpl) {
      return tpl.tag === 'official' && tpl.id === ctx.params.id;
    });
    if (!item) {
      fail(res, 404, 'TEMPLATE_NOT_FOUND', 'agent template not found');
      return;
    }
    ok(res, item);
  }

  async function updateAgentTemplate(req, res, ctx) {
    var actor = ctx.actor;
    ensureAgentTemplates(store);
    var item = store.agentTemplates.find(function (tpl) {
      return tpl.tag === 'official' && tpl.id === ctx.params.id;
    });
    if (!item) {
      fail(res, 404, 'TEMPLATE_NOT_FOUND', 'agent template not found');
      return;
    }
    var body = await parseBody(req);
    var before = Object.assign({}, item);
    if (body.name !== undefined) {
      var name = String(body.name || '').trim();
      if (!name) {
        fail(res, 400, 'INVALID_NAME', 'name is required');
        return;
      }
      item.name = name;
    }
    if (body.fields !== undefined) {
      var fields;
      try {
        fields = parseAgentTemplateFields(body.fields);
      } catch (error) {
        fail(res, 400, 'INVALID_JSON', 'fields must be valid JSON');
        return;
      }
      if (!fields || (typeof fields !== 'object')) {
        fail(res, 400, 'INVALID_FIELDS', 'fields must be object or array');
        return;
      }
      item.fields = fields;
    }
    if (body.sample !== undefined) {
      item.sample = String(body.sample || '');
    }
    if (body.status !== undefined) {
      if (['active', 'archived'].indexOf(body.status) === -1) {
        fail(res, 400, 'INVALID_STATUS', 'status must be active or archived');
        return;
      }
      item.status = body.status;
    }
    item.updated_at = nowIso();
    item.updated_by = actor.id;
    writeAudit(store, {
      actor: actor,
      ip: getIp(req),
      module: 'agent_template',
      actionType: 'update',
      targetId: item.id,
      beforeJson: before,
      afterJson: item
    });
    ok(res, item);
  }

  return {
    agentTemplateDetail: withGuard(agentTemplateDetail),
    listAgentTemplates: withGuard(listAgentTemplates),
    updateAgentTemplate: withGuard(updateAgentTemplate),
    createDevice: withGuard(createDevice),
    createPaidUser: withGuard(createPaidUser),
    createAdminUser: withSuperGuard(createAdminUser),
    createQuickAction: withGuard(createQuickAction),
    createTemplate: withGuard(createTemplate),
    cancelOrder: withGuard(cancelOrder),
    dashboard: withGuard(dashboard),
    exportAuditLogs: withGuard(exportAuditLogs),
    exportDeviceImportTemplate: withGuard(exportDeviceImportTemplate),
    exportUsers: withGuard(exportUsers),
    forceUnbindDevice: withGuard(forceUnbindDevice),
    importDevices: withGuard(importDevices),
    importActivationCodes: withGuard(importActivationCodes),
    listActivationCodes: withGuard(listActivationCodes),
    listAdminUsers: withSuperGuard(listAdminUsers),
    listAuditLogs: withGuard(listAuditLogs),
    listDevices: withGuard(listDevices),
    listFeedbacks: withGuard(listFeedbacks),
    listOrders: withGuard(listOrders),
    listPaidUsers: withGuard(listPaidUsers),
    listQuickActions: withGuard(listQuickActions),
    listServiceRecords: withGuard(listServiceRecords),
    listTemplates: withGuard(listTemplates),
    listTokenUsage: withGuard(listTokenUsage),
    orderDetail: withGuard(orderDetail),
    paidUserDetail: withGuard(paidUserDetail),
    refundOrder: withGuard(refundOrder),
    templateDetail: withGuard(templateDetail),
    updateAdminUser: withSuperGuard(updateAdminUser),
    updateFeedback: withGuard(updateFeedback),
    updatePaidUser: withGuard(updatePaidUser),
    updateQuickAction: withGuard(updateQuickAction),
    updateTemplate: withGuard(updateTemplate)
  };
}

module.exports = {
  createAdminModule
};
