const { fail, ok, parseBody } = require('../http');
const { createId, nowIso } = require('../security/ids');
const { config } = require('../config');

function createUserApiModule(deps) {
  var store = deps.store;
  var auth = deps.auth;

  function inferTemplateAccess(serialNo) {
    var normalized = String(serialNo || '').trim().toUpperCase();
    if (/^PRO-/.test(normalized)) {
      return 'professional';
    }
    return 'general';
  }

  function isDevOnlyEnvelope(envelope) {
    var version = String(envelope && envelope.version || '');
    var algorithm = String(envelope && envelope.algorithm || '');
    return version === 'local-v1' ||
      version === 'dev-local-v1' ||
      algorithm === 'local-base64-placeholder' ||
      algorithm === 'dev-local-base64-placeholder';
  }

  function getUserTemplateAccess(userId) {
    var hasProfessionalDevice = store.devices.some((item) => {
      return item.boundUserId === userId &&
        item.bindStatus === 'bound' &&
        item.templateAccess === 'professional';
    });
    return hasProfessionalDevice ? 'professional' : 'general';
  }

  function canAccessTemplate(template, userId) {
    if (!template || template.status !== 'published') return false;
    if (template.audience === 'professional') {
      return getUserTemplateAccess(userId) === 'professional';
    }
    return true;
  }

  function publicTemplate(item) {
    return {
      id: item.id,
      templateCode: item.templateCode,
      name: item.name,
      description: item.description || '',
      category: item.category || item.department || '',
      audience: item.audience || 'general',
      scene: item.scene,
      type: item.type,
      variableDefs: item.variableDefs || [],
      useCount: item.useCount
    };
  }

  function findTemplate(id) {
    return store.templates.find((item) => item.id === id || item.templateCode === id);
  }

  function normalizeFieldValues(bodyValues) {
    var values = bodyValues || {};
    if (Array.isArray(values)) {
      return values.reduce((next, item) => {
        if (item && item.key) next[item.key] = item.value;
        return next;
      }, {});
    }
    return values;
  }

  function renderTemplateBody(template, values) {
    var lines = [];
    lines.push(template.name || '生成内容');
    (template.variableDefs || []).forEach((field) => {
      var value = String(values[field.key] || '').trim();
      if (value) {
        lines.push((field.label || field.key) + '：' + value);
      }
    });
    return lines.join('\n');
  }

  function buildTemplateConfirmText(template, values) {
    var missing = (template.variableDefs || []).filter((field) => {
      return field.required && !String(values[field.key] || '').trim();
    });
    if (!missing.length) {
      return '请确认正文中的事实、时间、对象和数字是否准确。';
    }
    return missing.map((field, index) => {
      return (index + 1) + '. 请补充或确认：' + (field.label || field.key);
    }).join('\n');
  }

  function mineDevice(req, res) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;
    ok(res, store.devices.find((item) => item.boundUserId === actor.id) || null);
  }

  async function bindDevice(req, res) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;
    var body = await parseBody(req);
    var serialNo = String(body.serialNo || '').trim();
    if (!serialNo) {
      fail(res, 400, 'SERIAL_REQUIRED', 'serialNo required');
      return;
    }
    var user = store.users.find((item) => item.id === actor.id);
    if (!user || user.memberStatus !== 'active') {
      fail(res, 403, 'ENTITLEMENT_REQUIRED', 'active service required');
      return;
    }
    var now = nowIso();
    var device = store.devices.find((item) => item.serialNo === serialNo);
    if (!device) {
      device = {
        id: createId('device'),
        mac: '',
        serialNo: serialNo,
        model: '',
        firmwareVersion: '',
        protocolVersion: '',
        templateAccess: inferTemplateAccess(serialNo),
        bindStatus: 'unbound',
        boundUserId: '',
        boundAt: '',
        createdAt: now,
        updatedAt: now
      };
      store.devices.push(device);
    }
    if (device.boundUserId && device.boundUserId !== actor.id) {
      fail(res, 409, 'DEVICE_ALREADY_BOUND', 'device already bound');
      return;
    }
    device.bindStatus = 'bound';
    device.boundUserId = actor.id;
    device.boundAt = now;
    device.updatedAt = now;
    ok(res, device);
  }

  async function unbindDevice(req, res) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;
    var body = await parseBody(req);
    var device = store.devices.find((item) => item.id === body.deviceId && item.boundUserId === actor.id);
    if (!device) {
      fail(res, 404, 'DEVICE_NOT_FOUND', 'device not found');
      return;
    }
    device.bindStatus = 'unbound';
    device.boundUserId = '';
    device.boundAt = '';
    device.updatedAt = nowIso();
    ok(res, device);
  }

  async function saveHistory(req, res) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;
    var body = await parseBody(req);
    if (!body.ciphertext || !body.envelope) {
      fail(res, 400, 'ENCRYPTED_CONTENT_REQUIRED', 'ciphertext and envelope required');
      return;
    }
    if (config.env === 'production' && isDevOnlyEnvelope(body.envelope)) {
      fail(res, 400, 'PRODUCTION_ENCRYPTION_REQUIRED', 'production history requires a non-placeholder envelope');
      return;
    }
    var item = {
      id: body.id || createId('hist'),
      userId: actor.id,
      ciphertext: body.ciphertext,
      envelope: body.envelope,
      source: body.source || 'manual',
      textLength: Number(body.textLength || 0),
      status: body.status || 'success',
      success: body.success !== false,
      createdAt: body.createdAt || nowIso()
    };
    store.encryptedHistory.unshift(item);
    ok(res, {
      id: item.id,
      source: item.source,
      textLength: item.textLength,
      status: item.status,
      success: item.success,
      createdAt: item.createdAt
    });
  }

  function listHistory(req, res) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;
    ok(res, store.encryptedHistory.filter((item) => item.userId === actor.id).map((item) => ({
      id: item.id,
      source: item.source,
      textLength: item.textLength,
      status: item.status,
      success: item.success !== false,
      createdAt: item.createdAt
    })));
  }

  function historyDetail(req, res, ctx) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;
    var item = store.encryptedHistory.find((record) => record.id === ctx.params.id && record.userId === actor.id);
    if (!item) {
      fail(res, 404, 'HISTORY_NOT_FOUND', 'history not found');
      return;
    }
    ok(res, item);
  }

  function purchaseEntitlement(req, res) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;
    var user = store.users.find((item) => item.id === actor.id);
    ok(res, {
      memberStatus: user ? user.memberStatus : 'none',
      memberEnd: user ? user.memberEnd : ''
    });
  }

  async function activatePurchase(req, res) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;
    var body = await parseBody(req);
    var code = String(body.activationCode || '').trim();
    var activation = store.activationCodes.find((item) => item.code === code && item.status === 'unused');
    if (!activation) {
      fail(res, 400, 'INVALID_ACTIVATION_CODE', 'invalid activation code');
      return;
    }
    var user = store.users.find((item) => item.id === actor.id);
    var now = nowIso();
    var end = new Date(Date.now() + activation.memberDays * 24 * 60 * 60 * 1000).toISOString();
    user.memberStatus = 'active';
    user.memberStart = now;
    user.memberEnd = end;
    user.updatedAt = now;
    activation.status = 'used';
    activation.usedBy = user.phone || user.id;
    activation.usedAt = now;
    ok(res, {
      memberStatus: user.memberStatus,
      memberStart: user.memberStart,
      memberEnd: user.memberEnd
    });
  }

  function purchaseRecords(req, res) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;
    var user = store.users.find((item) => item.id === actor.id);
    if (!user) {
      ok(res, []);
      return;
    }
    ok(res, [{
      id: 'svc_' + user.id,
      status: user.memberStatus,
      startedAt: user.memberStart,
      expiredAt: user.memberEnd
    }]);
  }

  async function submitFeedback(req, res) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;
    var body = await parseBody(req);
    var content = String(body.content || '');
    var item = {
      id: createId('feedback'),
      userId: actor.id,
      type: String(body.type || 'other'),
      contentLength: content.length,
      hasContact: Boolean(body.contact),
      status: 'pending',
      createdAt: nowIso()
    };
    store.feedbacks.unshift(item);
    ok(res, item);
  }

  async function submitIssue(req, res) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;
    var body = await parseBody(req);
    var description = String(body.description || '');
    var item = {
      id: createId('issue'),
      userId: actor.id,
      type: String(body.type || 'other'),
      descriptionLength: description.length,
      hasSerialNo: Boolean(body.serialNo),
      status: 'pending',
      createdAt: nowIso()
    };
    store.issues.unshift(item);
    ok(res, item);
  }

  async function saveLongTextTest(req, res) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;
    var body = await parseBody(req);
    var item = {
      id: createId('lt'),
      userId: actor.id,
      charCount: Number(body.charCount || 0),
      elapsedMs: Number(body.elapsedMs || 0),
      passed: Boolean(body.passed),
      mode: String(body.mode || ''),
      deviceSerial: body.deviceSerial ? 'provided' : '',
      createdAt: nowIso()
    };
    store.longTextTests = store.longTextTests || [];
    store.longTextTests.unshift(item);
    ok(res, item);
  }

  function listLongTextTests(req, res) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;
    store.longTextTests = store.longTextTests || [];
    ok(res, store.longTextTests.filter((item) => item.userId === actor.id));
  }

  async function submitBugReport(req, res) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;
    var body = await parseBody(req);
    var item = {
      id: createId('bug'),
      userId: actor.id,
      type: String(body.type || 'other'),
      reproduceLength: String(body.reproduceSteps || '').length,
      expectedLength: String(body.expectedResult || '').length,
      actualLength: String(body.actualResult || '').length,
      status: 'pending',
      createdAt: nowIso()
    };
    store.bugReports = store.bugReports || [];
    store.bugReports.unshift(item);
    ok(res, item);
  }

  function listTemplates(req, res) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;
    ok(res, store.templates
      .filter((item) => canAccessTemplate(item, actor.id))
      .map(publicTemplate));
  }

  function templateDetail(req, res, ctx) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;
    var item = findTemplate(ctx.params.id);
    if (!canAccessTemplate(item, actor.id)) {
      fail(res, 404, 'TEMPLATE_NOT_FOUND', 'template not found');
      return;
    }
    ok(res, publicTemplate(item));
  }

  async function generateTemplate(req, res, ctx) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;
    var item = findTemplate(ctx.params.id);
    if (!canAccessTemplate(item, actor.id)) {
      fail(res, 404, 'TEMPLATE_NOT_FOUND', 'template not found');
      return;
    }
    var body = await parseBody(req);
    var values = normalizeFieldValues(body.values || body.fields || {});
    var missing = (item.variableDefs || []).filter((field) => {
      return field.required && !String(values[field.key] || '').trim();
    });
    if (missing.length) {
      fail(res, 400, 'TEMPLATE_REQUIRED_FIELDS_MISSING', 'required fields missing', {
        fields: missing.map((field) => field.key)
      });
      return;
    }
    item.useCount = Number(item.useCount || 0) + 1;
    item.updatedAt = nowIso();
    var bodyText = renderTemplateBody(item, values);
    var confirmText = buildTemplateConfirmText(item, values);
    ok(res, {
      templateId: item.id,
      templateCode: item.templateCode,
      provider: 'backend-template-engine',
      bodyText: bodyText,
      confirmText: confirmText,
      rawText: ['【正文】', bodyText, '', '【待确认】', confirmText].join('\n')
    });
  }

  function firmware(req, res) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;
    var device = store.devices.find((item) => item.boundUserId === actor.id);
    if (!device) {
      ok(res, null);
      return;
    }
    ok(res, {
      serialNo: device.serialNo,
      firmwareVersion: device.firmwareVersion || '',
      protocolVersion: device.protocolVersion || '',
      upgradeStatus: 'none'
    });
  }

  return {
    activatePurchase,
    bindDevice,
    firmware,
    generateTemplate,
    historyDetail,
    listHistory,
    listLongTextTests,
    listTemplates,
    mineDevice,
    purchaseEntitlement,
    purchaseRecords,
    saveHistory,
    saveLongTextTest,
    submitBugReport,
    submitFeedback,
    submitIssue,
    templateDetail,
    unbindDevice
  };
}

module.exports = {
  createUserApiModule
};
