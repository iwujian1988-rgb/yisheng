const { fail, ok, parseBody } = require('../http');
const { createId, nowIso } = require('../security/ids');
const { config } = require('../config');
const { verifyPassword } = require('../security/password');
const { publicDevice } = require('./auth');

function createUserApiModule(deps) {
  var store = deps.store;
  var auth = deps.auth;

  function isDevOnlyEnvelope(envelope) {
    var version = String(envelope && envelope.version || '');
    var algorithm = String(envelope && envelope.algorithm || '');
    return version === 'local-v1' ||
      version === 'dev-local-v1' ||
      algorithm === 'local-base64-placeholder' ||
      algorithm === 'dev-local-base64-placeholder';
  }

  function canAccessTemplate(template, hasDevice, isMember) {
    if (!template || template.status !== 'published') return false;
    if (template.audience === 'professional') {
      return isMember && hasDevice;
    }
    return true;
  }

  function isMemberActive(userId) {
    var user = store.users.find((item) => item.id === userId);
    return Boolean(user && user.memberStatus === 'active');
  }

  function hasBoundDevice(userId) {
    return store.devices.some(
      function (d) { return d.boundUserId === userId && d.bindStatus === 'bound'; }
    );
  }

  function publicQuickAction(item) {
    return {
      id: item.id,
      actionCode: item.actionCode,
      title: item.title,
      description: item.description || '',
      category: item.category || '',
      audience: item.audience || 'general',
      placeholder: item.placeholder || '',
      promptContent: item.promptContent || '',
      outputStructure: item.outputStructure || [],
      qualityRules: item.qualityRules || [],
      missingInfoRules: item.missingInfoRules || [],
      forbiddenRules: item.forbiddenRules || [],
      sortOrder: Number(item.sortOrder || 0)
    };
  }

  function canAccessQuickAction(item, hasDevice) {
    if (!item || item.status !== 'published') return false;
    if (item.audience === 'professional' && !hasDevice) return false;
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
      outputStructure: item.outputStructure || [],
      qualityRules: item.qualityRules || [],
      missingInfoRules: item.missingInfoRules || [],
      forbiddenRules: item.forbiddenRules || [],
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
    lines.push(template.name || '\u751F\u6210\u5185\u5BB9');
    (template.variableDefs || []).forEach((field) => {
      var value = String(values[field.key] || '').trim();
      if (value) {
        lines.push((field.label || field.key) + '\uFF1A' + value);
      }
    });
    return lines.join('\n');
  }

  function buildTemplateConfirmText(template, values) {
    var missing = (template.variableDefs || []).filter((field) => {
      return field.required && !String(values[field.key] || '').trim();
    });
    if (!missing.length) {
      return '\u8BF7\u786E\u8BA4\u6B63\u6587\u4E2D\u7684\u4E8B\u5B9E\u3001\u65F6\u95F4\u3001\u5BF9\u8C61\u548C\u6570\u5B57\u662F\u5426\u51C6\u786E\u3002';
    }
    return missing.map((field, index) => {
      return (index + 1) + '. \u8BF7\u8865\u5145\u6216\u786E\u8BA4\uFF1A' + (field.label || field.key);
    }).join('\n');
  }

  function templateSections(template) {
    if (Array.isArray(template.outputStructure) && template.outputStructure.length) {
      return template.outputStructure;
    }
    return (template.variableDefs || []).map((field) => field.label || field.key).filter(Boolean);
  }

  function renderTemplateBodyV2(template, values) {
    var lines = [template.name || '\u751F\u6210\u5185\u5BB9', ''];
    templateSections(template).forEach((section) => {
      var matched = (template.variableDefs || []).find((field) => {
        return (field.label || field.key) === section || field.key === section;
      });
      var value = matched ? String(values[matched.key] || '').trim() : '';
      lines.push(String(section || '').replace(/\uFF1A$/, '') + '\uFF1A');
      lines.push(value || '\u5F85\u8865\u5145');
      lines.push('');
    });
    return lines.join('\n').trim();
  }

  function renderTemplateInput(template, values) {
    return (template.variableDefs || []).map((field) => {
      return (field.label || field.key) + '\uFF1A' + (String(values[field.key] || '').trim() || '\u672A\u63D0\u4F9B');
    }).join('\n');
  }

  function buildTemplateConfirmTextV2(template, values) {
    var missing = (template.variableDefs || []).filter((field) => {
      return field.required && !String(values[field.key] || '').trim();
    });
    if (!missing.length) {
      return '\u8BF7\u786E\u8BA4\u6B63\u6587\u4E2D\u7684\u4E8B\u5B9E\u3001\u65F6\u95F4\u3001\u5BF9\u8C61\u3001\u6570\u5B57\u548C\u672A\u8865\u5145\u4FE1\u606F\u662F\u5426\u51C6\u786E\u3002';
    }
    return missing.map((field, index) => {
      return (index + 1) + '. \u8BF7\u8865\u5145\u6216\u786E\u8BA4\uFF1A' + (field.label || field.key);
    }).join('\n');
  }

  function splitSectionedText(text) {
    var value = String(text || '').trim();
    var bodyMarker = '\u3010\u6B63\u6587\u3011';
    var confirmMarker = '\u3010\u5F85\u786E\u8BA4\u3011';
    var bodyStart = value.indexOf(bodyMarker);
    var confirmStart = value.indexOf(confirmMarker);
    if (confirmStart >= 0) {
      return {
        bodyText: value.slice(bodyStart >= 0 ? bodyStart + bodyMarker.length : 0, confirmStart).trim(),
        confirmText: value.slice(confirmStart + confirmMarker.length).trim()
      };
    }
    return {
      bodyText: value.replace(bodyMarker, '').trim(),
      confirmText: '\u8BF7\u786E\u8BA4\u6B63\u6587\u4E2D\u7684\u4E8B\u5B9E\u3001\u65F6\u95F4\u3001\u5BF9\u8C61\u3001\u6570\u5B57\u548C\u672A\u8865\u5145\u4FE1\u606F\u662F\u5426\u51C6\u786E\u3002'
    };
  }

  function normalizeSectionedText(text, fallbackConfirmText) {
    var value = String(text || '').trim();
    if (value.indexOf('\u3010\u6B63\u6587\u3011') !== -1 && value.indexOf('\u3010\u5F85\u786E\u8BA4\u3011') !== -1) {
      return value;
    }
    return ['\u3010\u6B63\u6587\u3011', value, '', '\u3010\u5F85\u786E\u8BA4\u3011', fallbackConfirmText || '\u8BF7\u786E\u8BA4\u6B63\u6587\u662F\u5426\u51C6\u786E\u3002'].join('\n');
  }

  function buildTemplateAiMessages(template, values) {
    var outputStructure = templateSections(template);
    var qualityRules = Array.isArray(template.qualityRules) ? template.qualityRules : [];
    var missingInfoRules = Array.isArray(template.missingInfoRules) ? template.missingInfoRules : [];
    var forbiddenRules = Array.isArray(template.forbiddenRules) ? template.forbiddenRules : [];
    var systemLines = [
      '\u4F60\u662F\u4E00\u4E2A\u6A21\u677F\u5316\u6587\u672C\u751F\u6210\u52A9\u624B\u3002',
      '\u4F60\u5FC5\u987B\u53EA\u57FA\u4E8E\u7528\u6237\u5DF2\u7ECF\u63D0\u4F9B\u7684\u4FE1\u606F\u751F\u6210\u6B63\u6587\uFF0C\u4E0D\u80FD\u65B0\u589E\u3001\u731C\u6D4B\u6216\u7F16\u9020\u672A\u63D0\u4F9B\u7684\u4E8B\u5B9E\u3002',
      '\u4F60\u53EF\u4EE5\u628A\u53E3\u8BED\u5316\u3001\u96F6\u6563\u7684\u8F93\u5165\u6574\u7406\u6210\u7ED3\u6784\u5B8C\u6574\u3001\u8868\u8FBE\u6E05\u695A\u3001\u4FBF\u4E8E\u53D1\u9001\u5230\u7535\u8111\u7684\u6587\u672C\u3002',
      '\u5982\u679C\u4FE1\u606F\u7F3A\u5931\uFF0C\u5FC5\u987B\u5199\u6210\u201C\u672A\u63D0\u4F9B\u201D\u201C\u5F85\u8865\u5145\u201D\u6216\u201C\u5F85\u7528\u6237\u786E\u8BA4\u201D\uFF0C\u4E0D\u80FD\u5199\u6210\u786E\u5B9A\u4E8B\u5B9E\u3002',
      '\u8F93\u51FA\u5FC5\u987B\u4E25\u683C\u5305\u542B\u4E24\u4E2A\u6807\u9898\uFF1A\u3010\u6B63\u6587\u3011\u548C\u3010\u5F85\u786E\u8BA4\u3011\u3002',
      '\u3010\u6B63\u6587\u3011\u53EA\u653E\u7528\u6237\u53EF\u4EE5\u590D\u5236\u53D1\u9001\u7684\u6587\u672C\u3002',
      '\u3010\u5F85\u786E\u8BA4\u3011\u5217\u51FA\u7528\u6237\u53D1\u9001\u524D\u9700\u8981\u6838\u5BF9\u3001\u8865\u5145\u6216\u786E\u8BA4\u7684\u4E8B\u9879\u3002',
      '\u4E0D\u8981\u8F93\u51FA\u89E3\u91CA\u8FC7\u7A0B\uFF0C\u4E0D\u8981\u8F93\u51FA\u5F00\u53D1\u914D\u7F6E\uFF0C\u4E0D\u8981\u63D0\u5230 prompt\u3001provider\u3001worker\u3001API\u3002'
    ];
    if (template.promptContent) {
      systemLines.push('\u5F53\u524D\u6A21\u677F\u89C4\u5219\uFF1A\n' + template.promptContent);
    }
    if (outputStructure.length) {
      systemLines.push('\u6B63\u6587\u5EFA\u8BAE\u7ED3\u6784\uFF1A\n' + outputStructure.map((item, index) => (index + 1) + '. ' + item).join('\n'));
    }
    if (qualityRules.length) {
      systemLines.push('\u751F\u6210\u65F6\u91CD\u70B9\u68C0\u67E5\uFF1A\n' + qualityRules.map((item) => '- ' + item).join('\n'));
    }
    if (missingInfoRules.length) {
      systemLines.push('\u7F3A\u5931\u4FE1\u606F\u5904\u7406\u89C4\u5219\uFF1A\n' + missingInfoRules.map((item) => '- ' + item).join('\n'));
    }
    if (forbiddenRules.length) {
      systemLines.push('\u7981\u6B62\u89C4\u5219\uFF1A\n' + forbiddenRules.map((item) => '- ' + item).join('\n'));
    }
    return [
      { role: 'system', content: systemLines.join('\n') },
      {
        role: 'user',
        content: [
          '\u6A21\u677F\u540D\u79F0\uFF1A' + (template.name || ''),
          '\u6A21\u677F\u573A\u666F\uFF1A' + (template.scene || template.category || ''),
          '\u7528\u6237\u586B\u5199\u5185\u5BB9\uFF1A',
          renderTemplateInput(template, values)
        ].join('\n')
      }
    ];
  }

  async function callTemplateAi(template, values, fallbackConfirmText) {
    if (!config.aiApiKey || (!config.aiChatCompletionsUrl && !config.aiBaseUrl)) {
      return null;
    }
    var controller = new AbortController();
    var timer = setTimeout(() => controller.abort(), config.aiTimeoutMs);
    try {
      var endpoint = config.aiChatCompletionsUrl || (config.aiBaseUrl.replace(/\/$/, '') + '/v1/chat/completions');
      var response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + config.aiApiKey
        },
        body: JSON.stringify({
          model: config.aiModel,
          messages: buildTemplateAiMessages(template, values),
          temperature: 0.2,
          max_tokens: 1800
        }),
        signal: controller.signal
      });
      var payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error && payload.error.message ? payload.error.message : 'AI provider request failed');
      }
      var content = payload.choices && payload.choices[0] && payload.choices[0].message
        ? payload.choices[0].message.content
        : '';
      var rawText = normalizeSectionedText(content, fallbackConfirmText);
      var sections = splitSectionedText(rawText);
      return {
        provider: config.aiProvider,
        status: 'ai_generated',
        model: config.aiModel,
        bodyText: sections.bodyText,
        confirmText: sections.confirmText,
        rawText: rawText,
        usage: payload.usage || null
      };
    } finally {
      clearTimeout(timer);
    }
  }

  function mineDevice(req, res) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;
    ok(res, publicDevice(store.devices.find((item) => item.boundUserId === actor.id && item.bindStatus === 'bound') || null));
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
      if (!config.allowUnknownDeviceBinding) {
        fail(res, 404, 'DEVICE_NOT_REGISTERED', 'device is not registered');
        return;
      }
      device = {
        id: createId('device'),
        mac: '',
        serialNo: serialNo,
        model: '',
        firmwareVersion: '',
        protocolVersion: '',
        proofCodeHash: '',
        bindStatus: 'unbound',
        reservedUserId: '',
        boundUserId: '',
        boundAt: '',
        createdAt: now,
        updatedAt: now
      };
      store.devices.push(device);
    }
    if (device.reservedUserId && device.reservedUserId !== actor.id) {
      fail(res, 403, 'DEVICE_RESERVED_FOR_OTHER_USER', 'device is reserved for another user');
      return;
    }
    if (device.proofCodeHash) {
      if (!verifyPassword(String(body.proofCode || ''), device.proofCodeHash)) {
        fail(res, 403, 'DEVICE_PROOF_INVALID', 'device proofCode invalid');
        return;
      }
    } else if (!String(body.proofCode || '').trim()) {
      fail(res, 400, 'DEVICE_PROOF_REQUIRED', 'proofCode required');
      return;
    }
    if (device.boundUserId && device.boundUserId !== actor.id) {
      fail(res, 409, 'DEVICE_ALREADY_BOUND', 'device already bound');
      return;
    }
    device.bindStatus = 'bound';
    device.reservedUserId = '';
    device.boundUserId = actor.id;
    device.boundAt = now;
    device.updatedAt = now;
    ok(res, publicDevice(device));
  }

  async function autoBindDevice(req, res) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;
    var user = store.users.find((item) => item.id === actor.id);
    if (!user || user.memberStatus !== 'active') {
      fail(res, 403, 'ENTITLEMENT_REQUIRED', 'active service required');
      return;
    }
    var existing = store.devices.find(
      (item) => item.boundUserId === actor.id && item.bindStatus === 'bound'
    );
    if (existing) {
      ok(res, publicDevice(existing));
      return;
    }
    var body = await parseBody(req);
    var bleName = String(body.bleDeviceName || '').trim();
    var bleId = String(body.bleDeviceId || '').trim();
    var now = nowIso();
    var device = {
      id: createId('device'),
      mac: bleId,
      serialNo: bleName || 'BLE-AUTO',
      model: 'TXT-HID',
      firmwareVersion: '',
      protocolVersion: '',
      proofCodeHash: '',
      bindStatus: 'bound',
      reservedUserId: '',
      boundUserId: actor.id,
      boundAt: now,
      createdAt: now,
      updatedAt: now
    };
    store.devices.push(device);
    ok(res, publicDevice(device));
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
    ok(res, publicDevice(device));
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
      memberEnd: user.memberEnd,
      purchaseStatus: 'paid',
      deviceBindingStatus: store.devices.some((item) => item.boundUserId === actor.id && item.bindStatus === 'bound') ? 'bound' : 'not_bound',
      serviceStatus: user.memberStatus
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

  function listTemplates(req, res, ctx) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;
    var isMember = isMemberActive(actor.id);
    var hasDevice = hasBoundDevice(actor.id);
    var accessible = store.templates
      .filter((item) => canAccessTemplate(item, hasDevice, isMember));
    var categories = [];
    accessible.forEach((item) => {
      if (item.category && categories.indexOf(item.category) === -1) {
        categories.push(item.category);
      }
    });
    ok(res, {
      templates: accessible.map(publicTemplate),
      categories: categories
    });
  }

  function listQuickActions(req, res, ctx) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;
    var hasDevice = hasBoundDevice(actor.id);
    var accessible = (store.quickActions || [])
      .filter((item) => canAccessQuickAction(item, hasDevice))
      .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
    var categories = [];
    accessible.forEach((item) => {
      if (item.category && categories.indexOf(item.category) === -1) {
        categories.push(item.category);
      }
    });
    var prompts = store.defaultPrompts || {};
    var defaultPrompt = prompts.general || '';
    ok(res, {
      defaultPrompt: defaultPrompt,
      categories: categories,
      quickActions: accessible.map(publicQuickAction)
    });
  }

  function templateDetail(req, res, ctx) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;
    var isMember = isMemberActive(actor.id);
    var hasDevice = hasBoundDevice(actor.id);
    var item = findTemplate(ctx.params.id);
    if (!canAccessTemplate(item, hasDevice, isMember)) {
      fail(res, 404, 'TEMPLATE_NOT_FOUND', 'template not found');
      return;
    }
    ok(res, publicTemplate(item));
  }

  async function generateTemplate(req, res, ctx) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;
    var isMember = isMemberActive(actor.id);
    if (!isMember) {
      fail(res, 403, 'MEMBER_REQUIRED', 'template generation requires active membership');
      return;
    }
    var hasDevice = hasBoundDevice(actor.id);
    var item = findTemplate(ctx.params.id);
    if (!canAccessTemplate(item, hasDevice, isMember)) {
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
    var bodyText = renderTemplateBodyV2(item, values);
    var confirmText = buildTemplateConfirmTextV2(item, values);
    var aiResult = null;
    try {
      aiResult = await callTemplateAi(item, values, confirmText);
    } catch (error) {
      fail(res, 502, 'AI_PROVIDER_FAILED', error.message);
      return;
    }
    if (aiResult) {
      ok(res, Object.assign({
        templateId: item.id,
        templateCode: item.templateCode
      }, aiResult));
      return;
    }
    ok(res, {
      templateId: item.id,
      templateCode: item.templateCode,
      provider: 'backend-template-engine',
      status: 'basic_generated',
      bodyText: bodyText,
      confirmText: confirmText,
      rawText: ['\u3010\u6B63\u6587\u3011', bodyText, '', '\u3010\u5F85\u786E\u8BA4\u3011', confirmText].join('\n')
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
    autoBindDevice,
    bindDevice,
    firmware,
    generateTemplate,
    historyDetail,
    listHistory,
    listLongTextTests,
    listQuickActions,
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
