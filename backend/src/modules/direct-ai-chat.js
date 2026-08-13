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

function templateForPrompt(template) {
  if (!template || typeof template !== 'object') return null;
  return {
    id: template.id || '',
    name: template.name || '',
    templateType: template.templateType || template.template_type || '',
    fields: template.fields || {}
  };
}

function splitSectionedOutput(text) {
  var value = String(text || '').trim();
  var bodyMatch = /^[ \t]*(?:#+[ \t]*)?(?:【[ \t]*正文[ \t]*】|正文[：:])[ \t]*/m.exec(value);
  var confirmMatch = /^[ \t]*(?:#+[ \t]*)?(?:【[ \t]*待确认(?:事项)?[ \t]*】|待确认(?:事项)?[：:])[ \t]*/m.exec(value);
  var bodyStart = bodyMatch ? bodyMatch.index + bodyMatch[0].length : 0;
  var confirmStart = confirmMatch ? confirmMatch.index : -1;
  var bodyText = value.slice(bodyStart);
  var confirmRaw = '';
  if (confirmStart >= 0) {
    bodyText = value.slice(bodyStart, confirmStart).trim();
    confirmRaw = value.slice(confirmStart + confirmMatch[0].length).trim();
  }
  return {
    bodyText: bodyText,
    confirmItems: confirmRaw.split(/\r?\n/).map(function (line) {
      return line.trim().replace(/^[-*\d.、）)\s]+/, '');
    }).filter(Boolean)
  };
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
    system.push('Follow this template structure when relevant: ' + JSON.stringify(templateForPrompt(data.template)));
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
      'Never infer or add a diagnosis, diagnostic basis, differential diagnosis, examination finding, treatment, medication instruction, monitoring plan, prognosis, or risk conclusion unless that exact fact is present in the user sources.',
      'Do not add clinical interpretation, evaluation, significance, concern, causal explanation, or recommendation that is not explicitly present in the user sources. Reorganize and normalize wording only.',
      'A template section is not permission to create its content. If a section has no supported fact, omit the whole section from the body.',
      'Output only the document itself. Do not add a preface, closing offer, markdown bold markers, markdown separators, or phrases such as "根据您提供的信息" and "如需补充请告知".',
      'Keep every number, duration, drug name, allergy, negation, and uncertainty exactly consistent with the source.',
      'Return exactly two sections: 【正文】 followed by the document, then 【待确认】 followed only by material omissions. If nothing material needs confirmation, write "无" under 【待确认】.',
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

    var sectioned = splitSectionedOutput(content);
    var safeContent = await wxContentCheck.sanitizeText(content);
    var safeBodyText = await wxContentCheck.sanitizeText(sectioned.bodyText);
    var safeConfirmItems = [];
    for (var i = 0; i < sectioned.confirmItems.length; i += 1) {
      var confirmItem = sectioned.confirmItems[i];
      if (confirmItem === '无' || confirmItem === '无。') continue;
      safeConfirmItems.push(await wxContentCheck.sanitizeText(confirmItem));
    }
    return {
      type: 'text',
      status: 'ok',
      resultText: safeContent,
      bodyText: safeBodyText,
      confirmText: safeConfirmItems.join('\n'),
      confirmItems: safeConfirmItems,
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
  isConfigured,
  splitSectionedOutput
};
