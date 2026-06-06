const { config } = require('../config');
const { fail, ok, parseBody } = require('../http');

function createProviderGatewayModule(deps) {
  var auth = deps.auth;

  async function callJsonWorker(url, payload) {
    var response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    var data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || data.error || 'worker request failed');
    }
    return data;
  }

  function buildFallbackAiResult(redactedText) {
    var text = String(redactedText || '').trim();
    return [
      '【正文】',
      text || '暂无可生成内容。',
      '',
      '【待确认】',
      '1. 请确认正文中的事实、时间、对象和数字是否准确。',
      '2. 请确认是否还有必须补充的信息。',
      '3. 当前未配置真实 AI Provider，本结果来自网关占位能力。'
    ].join('\n');
  }

  function ensureSectionedOutput(text) {
    var value = String(text || '').trim();
    if (!value) return buildFallbackAiResult('');
    if (value.indexOf('【正文】') !== -1 && value.indexOf('【待确认】') !== -1) {
      return value;
    }
    return [
      '【正文】',
      value,
      '',
      '【待确认】',
      '1. 请确认正文中的事实、时间、对象和数字是否准确。',
      '2. 请确认是否还有必须补充的信息。'
    ].join('\n');
  }

  function buildAiMessages(body) {
    return [
      {
        role: 'system',
        content: [
          '你是一个通用文本整理助手。',
          '只基于用户提供的信息生成内容，不编造未提供的事实。',
          '输出必须包含两个段落标题：【正文】和【待确认】。',
          '【正文】用于发送到目标电脑，应清晰、简洁、可直接使用。',
          '【待确认】列出用户需要核对或补充的信息。',
          '不要输出行业限定表述，不要输出法律或专业承诺。'
        ].join('\n')
      },
      {
        role: 'user',
        content: [
          '任务类型：' + String(body.taskType || 'content_polish'),
          '提示配置：' + String(body.promptTitle || body.promptId || ''),
          '用户已脱敏文本：',
          String(body.redactedText || '')
        ].join('\n')
      }
    ];
  }

  async function callConfiguredAi(body) {
    if (!config.aiBaseUrl) {
      throw new Error('AI_BASE_URL is not configured');
    }
    var controller = new AbortController();
    var timer = setTimeout(() => controller.abort(), config.aiTimeoutMs);
    try {
      var endpoint = config.aiBaseUrl.replace(/\/$/, '') + '/v1/chat/completions';
      var response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + config.aiApiKey
        },
        body: JSON.stringify({
          model: config.aiModel,
          messages: buildAiMessages(body),
          temperature: 0.2,
          max_tokens: 1600
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
      return {
        provider: config.aiProvider,
        status: 'ok',
        resultText: ensureSectionedOutput(content),
        model: config.aiModel,
        usage: payload.usage || null
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async function aiAssistant(req, res) {
    var actor = auth.requireUser(req, res);
    if (!actor) return;
    var body = await parseBody(req);
    if (!body.redactedText) {
      fail(res, 400, 'REDACTED_TEXT_REQUIRED', 'redactedText required');
      return;
    }
    if (config.aiApiKey) {
      try {
        ok(res, await callConfiguredAi(body));
        return;
      } catch (error) {
        fail(res, 502, 'AI_PROVIDER_FAILED', error.message);
        return;
      }
    }
    ok(res, {
      provider: config.aiProvider,
      status: 'not_configured',
      resultText: buildFallbackAiResult(body.redactedText),
      message: 'AI provider gateway is ready; provider credential is not configured.'
    });
  }

  async function ocrRecognize(req, res) {
    if (!auth.requireUser(req, res)) return;
    var body = await parseBody(req);
    if (!body.imageBase64) {
      fail(res, 400, 'OCR_IMAGE_REQUIRED', 'imageBase64 required');
      return;
    }
    if (config.ocrWorkerUrl) {
      try {
        var ocrData = await callJsonWorker(config.ocrWorkerUrl, {
          imageBase64: body.imageBase64,
          source: body.source || 'mini_program'
        });
        ok(res, {
          engine: config.ocrEngine,
          status: 'ok',
          provider: ocrData.provider || config.ocrEngine,
          text: ocrData.text || ocrData.resultText || '',
          confidence: Number(ocrData.confidence || 0)
        });
        return;
      } catch (error) {
        fail(res, 502, 'OCR_WORKER_FAILED', error.message);
        return;
      }
    }
    ok(res, {
      engine: config.ocrEngine,
      status: 'not_configured',
      text: '',
      message: 'Free OCR engine gateway is ready. Deploy PaddleOCR or RapidOCR worker on Aliyun.'
    });
  }

  async function asrTranscribe(req, res) {
    if (!auth.requireUser(req, res)) return;
    var body = await parseBody(req);
    if (!body.audioBase64) {
      fail(res, 400, 'ASR_AUDIO_REQUIRED', 'audioBase64 required');
      return;
    }
    if (config.asrWorkerUrl) {
      try {
        var asrData = await callJsonWorker(config.asrWorkerUrl, {
          audioBase64: body.audioBase64,
          format: body.format || 'mp3',
          source: body.source || 'mini_program'
        });
        ok(res, {
          engine: config.asrEngine,
          status: 'ok',
          provider: asrData.provider || config.asrEngine,
          text: asrData.text || asrData.resultText || '',
          durationMs: Number(asrData.durationMs || 0),
          confidence: Number(asrData.confidence || 0)
        });
        return;
      } catch (error) {
        fail(res, 502, 'ASR_WORKER_FAILED', error.message);
        return;
      }
    }
    ok(res, {
      engine: config.asrEngine,
      status: 'not_configured',
      text: '',
      message: 'ASR gateway is ready. Deploy faster-whisper worker on Aliyun if needed.'
    });
  }

  return {
    aiAssistant,
    asrTranscribe,
    ocrRecognize
  };
}

module.exports = {
  createProviderGatewayModule
};
