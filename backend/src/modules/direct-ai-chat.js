const { config } = require('../config');
const wxContentCheck = require('../security/wx-content-check');

function isConfigured() {
  return Boolean(config.aiApiKey && (config.aiChatCompletionsUrl || config.aiBaseUrl));
}

function appendAttachmentText(lines, attachments) {
  (attachments || []).forEach(function (attachment, index) {
    var text = String(attachment && attachment.ocrText || '').trim();
    if (text) lines.push('Image ' + (index + 1) + ' OCR text:\n' + text);
  });
}

function buildMessages(data, agentType) {
  var system = [
    'You are the AI writing assistant in the Xiaoke Typing Ape (小科打字猿) mini program.',
    'When asked who you are, answer in Chinese: “我是小科打字猿的 AI 文书助手，可以帮你整理、生成和修改文本。” Do not mention Yisheng, 医圣, medical use, or any former product name unless the current session is explicitly in professional mode.',
    'Reply in the same language as the user.',
    'Preserve names, dates, numbers, and facts. Never invent missing details.',
    'Make the result clear, structured, concise, and ready for further editing.'
  ];

  if (data.mode === 'professional') {
    system.push('This is an authorized professional documentation session. Use a professional documentation style while avoiding unsupported conclusions.');
  }
  if (data.template) {
    system.push('Follow this template when relevant: ' + JSON.stringify(data.template));
  }
  if (data.baseline_fields) {
    system.push('Use these baseline fields when relevant: ' + JSON.stringify(data.baseline_fields));
  }
  if (data.template || data.baseline_fields) {
    system.push([
      'Treat the user input as unstructured source notes: extract facts, map them into the matching template sections, and write a coherent professional document instead of echoing field labels or copying the notes line by line.',
      'For structured templates, draft from the information already provided instead of requiring every field before writing.',
      'Omit empty sections and field labels from the document body. Never fill the body with "未提供", "不详", "待补充", blank placeholders, or a checklist of every template field.',
      'Do not invent facts. Put only a few material omissions that genuinely affect usefulness under one concise "待确认" section.',
      'Use the template sample as a style and organization reference, never as patient facts.',
      'If the user says "没有", "不清楚", "未知", or "未提供", treat that field as unavailable and do not ask for it again.',
      'Use the conversation history as the source of truth. Ask at most one concise clarification only when it is essential; otherwise provide the best editable partial draft.'
    ].join(' '));
  }
  if (agentType === 'text' && data.task) {
    system.push('Requested text task: ' + String(data.task));
  }

  var messages = [{ role: 'system', content: system.join('\n') }];
  (Array.isArray(data.messages) ? data.messages : []).slice(-20).forEach(function (message) {
    if (!message || (message.role !== 'user' && message.role !== 'assistant')) return;
    var content = String(message.content || '').trim();
    if (content) messages.push({ role: message.role, content: content });
  });

  var userLines = [String(data.message || data.text || '').trim()];
  appendAttachmentText(userLines, data.attachments);
  messages.push({ role: 'user', content: userLines.filter(Boolean).join('\n\n') });
  return messages;
}

async function callDirectAi(agentType, data) {
  if (!isConfigured()) {
    throw new Error('AI provider is not configured');
  }

  var controller = new AbortController();
  var timer = setTimeout(function () {
    controller.abort();
  }, config.agentServiceTimeout || config.aiTimeoutMs || 120000);

  try {
    var endpoint = config.aiChatCompletionsUrl || (config.aiBaseUrl.replace(/\/$/, '') + '/v1/chat/completions');
    var response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + config.aiApiKey
      },
      body: JSON.stringify({
        model: config.aiResolvedModel,
        messages: buildMessages(data || {}, agentType),
        temperature: 0.3,
        max_tokens: 4096
      }),
      signal: controller.signal
    });
    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      throw new Error(payload.error && payload.error.message || 'AI provider request failed');
    }

    var content = payload.choices && payload.choices[0] && payload.choices[0].message
      ? String(payload.choices[0].message.content || '').trim()
      : '';
    if (!content) throw new Error('AI provider returned an empty response');

    var safeContent = await wxContentCheck.sanitizeText(content);
    return {
      type: 'text',
      status: 'ok',
      resultText: safeContent,
      bodyText: safeContent,
      confirmText: '',
      provider: config.aiProvider,
      model: config.aiModel,
      usage: payload.usage || null,
      timings: null,
      steps: []
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  buildMessages,
  callDirectAi,
  isConfigured
};
