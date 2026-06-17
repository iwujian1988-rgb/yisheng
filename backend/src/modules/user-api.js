const { fail, ok, parseBody } = require('../http');
const { createId, nowIso } = require('../security/ids');
const { config } = require('../config');
const { verifyPassword } = require('../security/password');
const { publicDevice } = require('./auth');
const deviceSession = require('../security/device-session');
const contentAccess = require('../security/content-access');

function createUserApiModule(deps) {
  var store = deps.store;
  var auth = deps.auth;

  function isMemberActive(userId) {
    return contentAccess.isMemberActive(store, userId);
  }

  function publicQuickAction(item) {
    return {
      id: item.id,
      actionCode: item.actionCode,
      title: item.title,
      description: item.description || '',
      category: item.category || '',
      placeholder: item.placeholder || '',
      inputHint: item.inputHint || '',
      outputHint: item.outputHint || '',
      sortOrder: Number(item.sortOrder || 0)
    };
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
    if (!value) {
      return '\u3010\u6B63\u6587\u3011\n\n\u3010\u5F85\u786E\u8BA4\u3011\n' + (fallbackConfirmText || '\u8BF7\u786E\u8BA4\u6B63\u6587\u662F\u5426\u51C6\u786E\u3002');
    }
    var hasBody = value.indexOf('\u3010\u6B63\u6587\u3011') !== -1;
    var hasConfirm = value.indexOf('\u3010\u5F85\u786E\u8BA4\u3011') !== -1;
    if (hasBody && hasConfirm) return value;
    if (hasConfirm && !hasBody) return '\u3010\u6B63\u6587\u3011\n' + value;
    if (hasBody && !hasConfirm) return value + '\n\n\u3010\u5F85\u786E\u8BA4\u3011\n' + (fallbackConfirmText || '\u8BF7\u786E\u8BA4\u6B63\u6587\u662F\u5426\u51C6\u786E\u3002');
    return ['\u3010\u6B63\u6587\u3011', value, '', '\u3010\u5F85\u786E\u8BA4\u3011', fallbackConfirmText || '\u8BF7\u786E\u8BA4\u6B63\u6587\u662F\u5426\u51C6\u786E\u3002'].join('\n');
  }

  function buildTemplateAiMessages(template, values) {
    var outputStructure = templateSections(template);
    var qualityRules = Array.isArray(template.qualityRules) ? template.qualityRules : [];
    var missingInfoRules = Array.isArray(template.missingInfoRules) ? template.missingInfoRules : [];
    var forbiddenRules = Array.isArray(template.forbiddenRules) ? template.forbiddenRules : [];
    var systemLines;
    if (template.promptContent) {
      systemLines = [template.promptContent];
    } else {
      systemLines = [
        '\u4F60\u662F\u4E00\u4E2A\u6A21\u677F\u5316\u6587\u672C\u751F\u6210\u52A9\u624B\uFF0C\u628A\u7528\u6237\u63D0\u4F9B\u7684\u96F6\u6563\u8F93\u5165\u6574\u7406\u4E3A\u7ED3\u6784\u5B8C\u6574\u3001\u8868\u8FBE\u6E05\u695A\u7684\u6587\u672C\u3002',
        '\u53EA\u57FA\u4E8E\u7528\u6237\u63D0\u4F9B\u7684\u4FE1\u606F\u751F\u6210\u6B63\u6587\uFF0C\u4E0D\u7F16\u9020\u672A\u63D0\u4F9B\u7684\u4E8B\u5B9E\u3002',
        '\u7F3A\u5931\u4FE1\u606F\u5199\u6210"\u672A\u63D0\u4F9B"\u6216"\u5F85\u8865\u5145"\u3002'
      ];
    }
    systemLines.push('');
    systemLines.push('\u8F93\u51FA\u683C\u5F0F\u8981\u6C42\uFF1A');
    systemLines.push('- \u6B63\u6587\u76F4\u63A5\u8F93\u51FA\uFF0C\u4E0D\u8981\u52A0"\u3010\u6B63\u6587\u3011"\u6807\u9898');
    systemLines.push('- \u672B\u5C3E\u52A0\u4E00\u6BB5"\u3010\u5F85\u786E\u8BA4\u3011"\uFF0C\u5217\u51FA\u9700\u8981\u6838\u5BF9\u6216\u8865\u5145\u7684\u4E8B\u9879');
    if (outputStructure.length) {
      systemLines.push('\u53C2\u8003\u7ED3\u6784\uFF1A\n' + outputStructure.map((item, index) => (index + 1) + '. ' + item).join('\n'));
    }
    if (qualityRules.length) {
      systemLines.push('\u8D28\u91CF\u68C0\u67E5\uFF1A\n' + qualityRules.map((item) => '- ' + item).join('\n'));
    }
    if (missingInfoRules.length) {
      systemLines.push('\u7F3A\u5931\u4FE1\u606F\u89C4\u5219\uFF1A\n' + missingInfoRules.map((item) => '- ' + item).join('\n'));
    }
    if (forbiddenRules.length) {
      systemLines.push('\u7981\u6B62\u89C4\u5219\uFF1A\n' + forbiddenRules.map((item) => '- ' + item).join('\n'));
    }
    systemLines.push('\u4E0D\u8981\u8F93\u51FA\u89E3\u91CA\u8FC7\u7A0B\uFF0C\u4E0D\u8981\u63D0\u5230 prompt\u3001provider\u3001worker\u3001API\u3002');
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
          temperature: 0.3,
          max_tokens: 3000
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

  function syncDeviceBleIdentity(device, bleName, bleId, now) {
    if (bleId) device.mac = bleId;
    if (bleName) device.serialNo = bleName;
    device.updatedAt = now || nowIso();
    return device;
  }

  async function autoBindDevice(req, res) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;
    var body = await parseBody(req);
    var bleName = String(body.bleDeviceName || '').trim();
    var bleId = String(body.bleDeviceId || '').trim();
    var now = nowIso();
    var existing = store.devices.find(
      (item) => item.boundUserId === actor.id && item.bindStatus === 'bound'
    );
    if (existing) {
      ok(res, publicDevice(syncDeviceBleIdentity(existing, bleName, bleId, now)));
      return;
    }
    var device = store.devices.find((item) => {
      return (bleName && item.serialNo === bleName) || (bleId && item.mac === bleId);
    });
    if (!device) {
      if (!config.allowUnknownDeviceBinding || config.env === 'production') {
        fail(res, 404, 'DEVICE_NOT_REGISTERED', 'device is not registered');
        return;
      }
      device = {
        id: createId('device'),
        mac: bleId,
        serialNo: bleName || 'BLE-AUTO',
        model: 'TXT-HID',
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
    if (device.boundUserId && device.boundUserId !== actor.id) {
      fail(res, 409, 'DEVICE_ALREADY_BOUND', 'device already bound');
      return;
    }
    syncDeviceBleIdentity(device, bleName, bleId, now);
    device.bindStatus = 'bound';
    device.boundUserId = actor.id;
    device.reservedUserId = '';
    device.boundAt = device.boundAt || now;
    ok(res, publicDevice(device));
  }

  async function startDeviceSession(req, res) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;
    var body = await parseBody(req);
    if (!isMemberActive(actor.id)) {
      fail(res, 403, 'MEMBER_REQUIRED', 'professional features require active membership');
      return;
    }
    var device = deviceSession.findBoundDevice(store, actor.id, body);
    if (!device) {
      fail(res, 403, 'DEVICE_NOT_BOUND', 'device is not bound to current user');
      return;
    }
    var challenge = deviceSession.createChallenge(store, actor.id, device);
    ok(res, {
      challengeId: challenge.id,
      nonce: challenge.nonce,
      expiresAt: challenge.expiresAt,
      expiresIn: Math.floor(deviceSession.CHALLENGE_TTL_MS / 1000),
      device: publicDevice(device)
    });
  }

  async function verifyDeviceSession(req, res) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;
    var body = await parseBody(req);
    var result = deviceSession.verifyChallengeAndIssue(store, actor.id, body);
    if (!result.ok) {
      fail(res, result.code === 'MEMBER_REQUIRED' ? 403 : 400, result.code, result.message);
      return;
    }
    ok(res, result.data);
  }

  function refreshDeviceSession(req, res) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;
    var result = deviceSession.refreshDeviceSession(store, req, actor.id);
    if (!result.ok) {
      fail(res, 403, result.code, result.message);
      return;
    }
    ok(res, result.data);
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
    var accessContext = contentAccess.getAccessContext({
      store,
      req,
      actor,
      businessKey: 'templates'
    });
    var accessible = contentAccess.filterVisibleItems(store.templates, {
      businessKey: 'templates',
      context: accessContext
    });
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
    var accessContext = contentAccess.getAccessContext({
      store,
      req,
      actor,
      businessKey: 'quickActions'
    });
    var accessible = contentAccess.filterVisibleItems(store.quickActions || [], {
      businessKey: 'quickActions',
      context: accessContext
    })
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
    var item = findTemplate(ctx.params.id);
    if (!item) {
      fail(res, 404, 'TEMPLATE_NOT_FOUND', 'template not found');
      return;
    }
    var access = contentAccess.requireItemAccess(item, {
      store,
      req,
      actor,
      businessKey: 'templates',
      notFoundCode: 'TEMPLATE_NOT_FOUND',
      notFoundMessage: 'template not found',
      deniedCode: 'TEMPLATE_ACCESS_DENIED',
      deniedMessage: 'template access denied'
    });
    if (!access.ok) {
      fail(res, access.statusCode, access.code, access.message);
      return;
    }
    ok(res, publicTemplate(item));
  }

  async function generateTemplate(req, res, ctx) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;
    var isMember = isMemberActive(actor.id);
    var body = await parseBody(req);
    if (!isMember) {
      fail(res, 403, 'MEMBER_REQUIRED', 'template generation requires active membership');
      return;
    }
    var item = findTemplate(ctx.params.id);
    if (!item || item.status !== 'published') {
      fail(res, 404, 'TEMPLATE_NOT_FOUND', 'template not found');
      return;
    }
    var access = contentAccess.requireItemAccess(item, {
      store,
      req,
      actor,
      businessKey: 'templates',
      notFoundCode: 'TEMPLATE_NOT_FOUND',
      notFoundMessage: 'template not found',
      deniedCode: 'TEMPLATE_ACCESS_DENIED',
      deniedMessage: 'template access denied'
    });
    if (!access.ok) {
      fail(res, access.statusCode, access.code, access.message);
      return;
    }
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
    listLongTextTests,
    listQuickActions,
    listTemplates,
    mineDevice,
    purchaseEntitlement,
    purchaseRecords,
    saveLongTextTest,
    startDeviceSession,
    submitBugReport,
    submitFeedback,
    submitIssue,
    templateDetail,
    refreshDeviceSession,
    unbindDevice,
    verifyDeviceSession
  };
}

module.exports = {
  createUserApiModule
};
