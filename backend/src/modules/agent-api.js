const { config } = require('../config');
const { fail, ok, parseBody, startSse, writeSse, endSse } = require('../http');
const { redactSensitiveText } = require('../security/redaction');
const { callAgentService, streamAgentChat } = require('./agent-proxy');
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

  async function invokeAgent(agentType, actor, data, res, featureName) {
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
      var code = error.name === 'AbortError' ? 504 : 502;
      fail(res, code, 'AGENT_SERVICE_FAILED', error.message);
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
    var mode = body.mode ? String(body.mode).trim().toLowerCase() : resolveMode(req, actor);
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
      data.template = templates.templateDetail(template);
    } else if (body.templateType) {
      data.baseline_fields = templates.getBaselineByType(String(body.templateType).trim());
    }

    var response = await invokeAgent('text', actor, data, res, 'AI text agent');
    if (!response) return;
    ok(res, Object.assign({}, response.result || {}, {
      redactionHits: guarded.hits,
      provider: 'agent-service'
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
    ok(res, response.result || {});
  }

  async function buildChatPayload(req, res) {
    var actor = auth.requireUser(req, res);
    if (!actor) return null;
    if (!requireMember(actor, res, 'AI chat')) return null;

    var body = await parseBody(req, { maxBytes: config.ocrMaxImageBytes * 6 });
    var messageRaw = String(body.message || body.text || '').trim();
    var guarded = messageRaw ? redactSensitiveText(messageRaw) : { text: '', hits: [] };
    var data = {
      message: guarded.text,
      mode: body.mode ? String(body.mode).trim().toLowerCase() : resolveMode(req, actor),
      userId: actor.id,
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
      messages: Array.isArray(body.messages) ? body.messages : [],
      templateName: body.templateName || ''
    };

    if (body.templateId) {
      var template = templates.findTemplate(store, body.templateId, actor.id);
      if (!template) {
        fail(res, 404, 'TEMPLATE_NOT_FOUND', 'template not found');
        return null;
      }
      data.template = templates.templateDetail(template);
    } else if (body.templateType) {
      data.baseline_fields = templates.getBaselineByType(String(body.templateType).trim());
    }

    return {
      actor: actor,
      data: data,
      redactionHits: guarded.hits
    };
  }

  async function agentChat(req, res) {
    var payload = await buildChatPayload(req, res);
    if (!payload) return;

    var response = await invokeAgent('chat', payload.actor, payload.data, res, 'AI chat');
    if (!response) return;
    ok(res, Object.assign({}, response.result || {}, {
      redactionHits: payload.redactionHits,
      provider: 'agent-service',
      timings: (response.result && response.result.timings) || null,
      steps: (response.result && response.result.steps) || []
    }));
  }

  async function agentChatStream(req, res) {
    var payload = await buildChatPayload(req, res);
    if (!payload) return;

    startSse(res, 200);
    try {
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
      if (!res.headersSent) {
        fail(res, error.name === 'AbortError' ? 504 : 502, 'AGENT_SERVICE_FAILED', error.message);
        return;
      }
      writeSse(res, 'error', {
        code: 'AGENT_SERVICE_FAILED',
        message: error.message || 'AI 服务暂时不可用'
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
