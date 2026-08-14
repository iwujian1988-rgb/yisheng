const { config } = require('../config');
const { fail, ok, parseBody, startSse, writeSse, endSse } = require('../http');
const { redactSensitiveText } = require('../security/redaction');
const medicalContentPolicy = require('../security/medical-content-policy');
const { callAgentService, streamAgentChat } = require('./agent-proxy');
const directAi = require('./direct-ai-chat');
const contentAccess = require('../security/content-access');

function createAgentApiModule(deps) {
  var auth = deps.auth;
  var store = deps.store;
  var templates = deps.templates;

  function isMemberActive(userId) {
    return contentAccess.isMemberActive(store, userId);
  }

  function requireMember(actor, res, featureName) {
    if (!isMemberActive(actor.id)) {
      fail(res, 403, 'MEMBER_REQUIRED', (featureName || 'feature') + ' requires active membership');
      return false;
    }
    return true;
  }

  function resolveMode(req, actor) {
    var accessContext = contentAccess.getAccessContext({
      store: store,
      req: req,
      actor: actor,
      businessKey: 'aiMode'
    });
    return accessContext.hasProfessionalAccess ? 'professional' : 'general';
  }

  function prepareText(body) {
    var raw = String(body.text || body.redactedText || body.message || '').trim();
    if (!raw) return null;
    return redactSensitiveText(raw);
  }

  function rejectMedicalContent(res) {
    fail(res, 422, 'PROFESSIONAL_CONTENT_NOT_SUPPORTED', 'This content is not supported in general mode.');
    return null;
  }

  function allowGeneralContent(res, mode, text, messages) {
    if (mode === 'professional') return true;
    if (medicalContentPolicy.containsMedicalContent(text)
      || medicalContentPolicy.containsMedicalContentInMessages(messages)) {
      rejectMedicalContent(res);
      return false;
    }
    return true;
  }

  async function invokeAgent(agentType, actor, data, res, featureName) {
    if (!config.agentServiceEnabled && (agentType === 'chat' || agentType === 'text')) {
      try {
        return { result: await directAi.callDirectAi(agentType, data) };
      } catch (error) {
        fail(res, error.name === 'AbortError' ? 504 : 502, 'AI_PROVIDER_FAILED', error.message);
        return null;
      }
    }

    try {
      var response = await callAgentService(agentType, {
        userContext: {
          userId: actor.id,
          memberStatus: 'active',
          deviceStatus: 'unknown'
        },
        data: data
      }, { userId: actor.id });
      return response;
    } catch (error) {
      if ((agentType === 'chat' || agentType === 'text') && directAi.isConfigured()) {
        try {
          return { result: await directAi.callDirectAi(agentType, data) };
        } catch (fallbackError) {
          error = fallbackError;
        }
      }
      var code = error.name === 'AbortError' ? 504 : 502;
      fail(res, code, 'AI_PROVIDER_FAILED', error.message);
      return null;
    }
  }

  async function agentText(req, res) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;
    if (!requireMember(actor, res, 'AI text agent')) return;

    var body = await parseBody(req);
    var guarded = prepareText(body);
    if (!guarded) {
      fail(res, 400, 'TEXT_REQUIRED', 'text is required');
      return;
    }

    var task = String(body.task || 'organize').trim().toLowerCase();
    var mode = resolveMode(req, actor);
    if (!allowGeneralContent(res, mode, guarded.text, body.messages)) return;
    var data = {
      text: guarded.text,
      task: task,
      mode: mode,
      messages: Array.isArray(body.messages) ? body.messages : []
    };

    if (body.templateId) {
      var template = templates.findTemplate(store, body.templateId, actor.id);
      if (!template) {
        fail(res, 404, 'TEMPLATE_NOT_FOUND', 'template not found');
        return;
      }
      data.template = templates.templateForGeneration(template);
    } else if (body.templateType) {
      data.baseline_fields = templates.getBaselineByType(String(body.templateType).trim());
    }

    var response = await invokeAgent('text', actor, data, res, 'AI text agent');
    if (!response) return;
    ok(res, Object.assign({}, response.result || {}, {
      redactionHits: guarded.hits,
      provider: response.result && response.result.provider || 'agent-service'
    }));
  }

  async function agentTemplate(req, res) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;
    if (!requireMember(actor, res, 'Template agent')) return;

    var body = await parseBody(req);
    var contentRaw = String(body.content || '').trim();
    if (!contentRaw) {
      fail(res, 400, 'CONTENT_REQUIRED', 'content is required');
      return;
    }
    var guarded = redactSensitiveText(contentRaw);
    if (!allowGeneralContent(res, resolveMode(req, actor), guarded.text)) return;
    var templateType = String(body.templateType || body.template_type || '').trim();
    if (!templateType) {
      fail(res, 400, 'TEMPLATE_TYPE_REQUIRED', 'templateType is required');
      return;
    }

    var data = {
      templateType: templateType,
      templateName: body.templateName || body.template_name || '',
      content: guarded.text,
      baselineFields: templates.getBaselineByType(templateType),
      options: body.options || {}
    };

    var response = await invokeAgent('template', actor, data, res, 'Template agent');
    if (!response) return;
    var result = response.result || {};
    if (result.success === false) {
      fail(res, 400, result.error && result.error.code || 'TEMPLATE_AGENT_FAILED', result.error && result.error.message || 'template agent failed');
      return;
    }
    ok(res, result);
  }

  async function agentOcr(req, res) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;
    if (!requireMember(actor, res, 'OCR agent')) return;

    var body = await parseBody(req);
    if (!body.imageBase64) {
      fail(res, 400, 'OCR_IMAGE_REQUIRED', 'imageBase64 required');
      return;
    }
    var response = await invokeAgent('ocr', actor, {
      imageBase64: body.imageBase64,
      mimeType: body.mimeType || '',
      fileType: body.fileType || '',
      source: body.source || 'mini_program'
    }, res, 'OCR agent');
    if (!response) return;
    if (resolveMode(req, actor) !== 'professional'
      && medicalContentPolicy.containsMedicalContent(response.result && response.result.text)) {
      rejectMedicalContent(res);
      return;
    }
    ok(res, response.result || {});
  }

  async function agentAsr(req, res) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;
    if (!requireMember(actor, res, 'ASR agent')) return;

    var body = await parseBody(req);
    if (!body.audioBase64) {
      fail(res, 400, 'ASR_AUDIO_REQUIRED', 'audioBase64 required');
      return;
    }
    var response = await invokeAgent('asr', actor, {
      audioBase64: body.audioBase64,
      mimeType: body.mimeType || '',
      format: body.format || '',
      source: body.source || 'mini_program'
    }, res, 'ASR agent');
    if (!response) return;
    if (resolveMode(req, actor) !== 'professional'
      && medicalContentPolicy.containsMedicalContent(response.result && response.result.text)) {
      rejectMedicalContent(res);
      return;
    }
    ok(res, response.result || {});
  }

  async function buildChatPayload(req, res) {
    var actor = auth.requireUser(req, res);
    if (!actor) return null;
    if (!requireMember(actor, res, 'AI chat')) return null;

    var body = await parseBody(req, { maxBytes: config.ocrMaxImageBytes * 6 });
    var messageRaw = String(body.message || body.text || '').trim();
    var materialRaw = String(body.materialText || '').trim();
    var guarded = messageRaw ? redactSensitiveText(messageRaw) : { text: '', hits: [] };
    var guardedMaterial = materialRaw ? redactSensitiveText(materialRaw) : { text: '', hits: [] };
    var mode = resolveMode(req, actor);
    var detailLevel = ['concise', 'standard', 'detailed'].indexOf(String(body.detailLevel || 'standard')) >= 0
      ? String(body.detailLevel || 'standard')
      : 'standard';
    if (!allowGeneralContent(res, mode, [guarded.text, guardedMaterial.text].filter(Boolean).join('\n'), body.messages)) return null;
    var data = {
      message: guarded.text,
      materialText: guardedMaterial.text,
      contextId: String(body.contextId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80),
      mode: mode,
      userId: actor.id,
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
      messages: Array.isArray(body.messages) ? body.messages : [],
      templateName: body.templateName || '',
      detailLevel: detailLevel
    };

    if (body.templateId) {
      var template = templates.findTemplate(store, body.templateId, actor.id);
      if (!template) {
        fail(res, 404, 'TEMPLATE_NOT_FOUND', 'template not found');
        return null;
      }
      data.template = templates.templateForGeneration(template);
    } else if (body.templateType) {
      data.baseline_fields = templates.getBaselineByType(String(body.templateType).trim());
    }

    return {
      actor: actor,
      data: data,
      redactionHits: (guarded.hits || []).concat(guardedMaterial.hits || [])
    };
  }

  async function agentChat(req, res) {
    var payload = await buildChatPayload(req, res);
    if (!payload) return;

    var response = await invokeAgent('chat', payload.actor, payload.data, res, 'AI chat');
    if (!response) return;
    ok(res, Object.assign({}, response.result || {}, {
      redactionHits: payload.redactionHits,
      provider: response.result && response.result.provider || 'agent-service',
      timings: (response.result && response.result.timings) || null,
      steps: (response.result && response.result.steps) || []
    }));
  }

  async function agentChatStream(req, res) {
    var payload = await buildChatPayload(req, res);
    if (!payload) return;

    startSse(res, 200);
    try {
      if (!config.agentServiceEnabled) {
        writeSse(res, 'status', { label: '\u6b63\u5728\u751f\u6210\u56de\u590d...' });
        var directResult = await directAi.callDirectAi('chat', payload.data);
        writeSse(res, 'done', { finalResult: directResult });
        endSse(res);
        return;
      }
      await streamAgentChat({
        userContext: {
          userId: payload.actor.id,
          memberStatus: 'active',
          deviceStatus: 'unknown'
        },
        data: payload.data
      }, { userId: payload.actor.id }, res);
      endSse(res);
    } catch (error) {
      if (directAi.isConfigured()) {
        try {
          writeSse(res, 'status', { label: '\u6b63\u5728\u5207\u6362\u5907\u7528 AI \u670d\u52a1...' });
          var fallbackResult = await directAi.callDirectAi('chat', payload.data);
          writeSse(res, 'done', { finalResult: fallbackResult });
          endSse(res);
          return;
        } catch (fallbackError) {
          error = fallbackError;
        }
      }
      if (!res.headersSent) {
        fail(res, error.name === 'AbortError' ? 504 : 502, 'AI_PROVIDER_FAILED', error.message);
        return;
      }
      writeSse(res, 'error', {
        code: 'AI_PROVIDER_FAILED',
        message: '\u0041\u0049 \u670d\u52a1\u6682\u65f6\u4e0d\u53ef\u7528\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5'
      });
      endSse(res);
    }
  }

  return {
    agentText: agentText,
    agentTemplate: agentTemplate,
    agentOcr: agentOcr,
    agentAsr: agentAsr,
    agentChat: agentChat,
    agentChatStream: agentChatStream
  };
}

module.exports = {
  createAgentApiModule: createAgentApiModule
};
