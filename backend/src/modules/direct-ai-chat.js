const { config } = require('../config');
const wxContentCheck = require('../security/wx-content-check');
const { assessTextQuality } = require('./text-quality');

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
    fields: template.fields || {},
    generationContract: template.generationContract || template.generation_contract || null,
    writingBlueprint: template.writingBlueprint || template.writing_blueprint || null
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

function unavailableSignature(value) {
  return Array.from(new Set(String(value || '')
    .replace(/[\s，。；：、,.;:（）()【】\-]/g, '')
    .split(''))).sort().join('');
}

function removeUnavailableBodyFragments(bodyText) {
  var movedItems = [];
  var marker = /(未提供|不详|待补充|____+)/;
  var lines = String(bodyText || '').split(/\r?\n/).map(function (line) {
    if (!marker.test(line)) return line;
    var fragments = line.match(/[^。！？；;]+[。！？；;]?/g) || [line];
    return fragments.filter(function (fragment) {
      if (!marker.test(fragment)) return true;
      var moved = fragment.trim().replace(/[。；;]+$/, '');
      if (moved) movedItems.push(moved);
      return false;
    }).join('').trim();
  });
  return {
    bodyText: lines.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
    movedItems: movedItems
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
      'Use the server-provided generation contract for structure, style, omission rules, and forbidden inferences. Do not use example-case facts as source material.',
      'Use the server-provided writing blueprint as the authoritative format and style reference. Follow its heading order, composition guidance, abstract style pattern, and standard-rich length policy.',
      'Treat the blueprint narrativeRequirements as mandatory sentence-structure rules whenever the corresponding source facts exist. Do not compress facts that the blueprint asks to place in separate complete sentences.',
      'Expand terse notes into complete professional sentences and coherent paragraphs using only grammar, chronology, transitions, normalization, and fact-preserving summaries. Do not stay telegraphic when several facts are available.',
      'Before finalizing, use the blueprint length policy only as a signal for possible over-compression. Prefer complete sentences when safe, but allow a shorter draft when the source is already structured or further expansion would require repetition, filler, or a new fact. Factual precision always outranks length.',
      'Never infer or add a diagnosis, diagnostic basis, differential diagnosis, examination finding, treatment, medication instruction, monitoring plan, prognosis, or risk conclusion unless that exact fact is present in the user sources.',
      'Do not add clinical interpretation, evaluation, significance, concern, causal explanation, or recommendation that is not explicitly present in the user sources. Reorganize and normalize wording only.',
      'Do not expand a supplied recommendation by inventing its rationale, purpose, expected benefit, likely effect, or phrases such as "based on the condition" and "to help improve" unless those meanings are explicit in the sources.',
      'A template section is not permission to create its content. If a section has no supported fact, omit the whole section from the body.',
      'Output only the document itself. Do not add a preface, closing offer, markdown bold markers, markdown separators, or phrases such as "根据您提供的信息" and "如需补充请告知".',
      'Keep every number, duration, drug name, allergy, negation, and uncertainty exactly consistent with the source.',
      'Return exactly two sections: 【正文】 followed by the document, then 【待确认】 followed only by material omissions. If nothing material needs confirmation, write "无" under 【待确认】.',
      'If the user says "没有", "不清楚", "未知", or "未提供", treat that field as unavailable and do not ask for it again.',
      'Use the conversation history as the source of truth. Ask at most one concise clarification only when it is essential; otherwise provide the best editable partial draft.'
    ].join(' '));
    var detailRule = {
      concise: 'Use concise detail: preserve key facts and necessary sections in complete sentences, without repetition.',
      standard: 'Use standard detail: produce a complete, balanced, directly editable draft that follows the template.',
      detailed: 'Use detailed treatment: fully organize chronology, fact relationships, and paragraph transitions without adding any fact, interpretation, rationale, or filler.'
    }[data.detailLevel] || 'Use standard detail: produce a complete, balanced, directly editable draft that follows the template.';
    system.push('User-selected detail level: ' + detailRule);
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

  var userLines = [];
  var instruction = String(data.message || data.text || '').trim();
  var materialText = String(data.materialText || '').trim();
  if (instruction) userLines.push('User instruction:\n' + instruction);
  if (materialText) userLines.push('Source text:\n' + materialText);
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
    var payload = {};
    var content = '';
    var baseMessages = buildMessages(data || {}, agentType);
    for (var attempt = 0; attempt < 2 && !content; attempt += 1) {
      var requestMessages = baseMessages.slice();
      if (attempt > 0) {
        requestMessages.push({
          role: 'user',
          content: 'The previous response was empty. Generate the complete document now from the same sources and writing blueprint.'
        });
      }
      var response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + config.aiApiKey
        },
        body: JSON.stringify({
          model: config.aiResolvedModel,
          messages: requestMessages,
          temperature: attempt === 0 ? 0.3 : 0.2,
          max_tokens: 4096
        }),
        signal: controller.signal
      });
      payload = await response.json().catch(function () { return {}; });
      if (!response.ok) {
        throw new Error(payload.error && payload.error.message || 'AI provider request failed');
      }
      content = payload.choices && payload.choices[0] && payload.choices[0].message
        ? String(payload.choices[0].message.content || '').trim()
        : '';
    }
    if (!content) throw new Error('AI provider returned an empty response after retry');

    var sourceText = [String(data.materialText || data.text || data.message || '').trim()];
    (data.attachments || []).forEach(function (attachment) {
      var attachmentText = String(attachment && attachment.ocrText || '').trim();
      if (attachmentText) sourceText.push(attachmentText);
    });
    var joinedSourceText = sourceText.filter(Boolean).join('\n\n');
    var preliminarySections = splitSectionedOutput(content);
    var preliminaryQuality = assessTextQuality(joinedSourceText, preliminarySections.bodyText, data.template);
    if (data.template && preliminaryQuality.richness && preliminaryQuality.richness.status === 'thin') {
      var refinementMessages = baseMessages.concat([
        { role: 'assistant', content: content },
        {
          role: 'user',
          content: 'Revise this draft once because it is over-compressed. Follow the writing blueprint headings and standard-detail structure whenever the source supports them. Preserve every source fact and number. Expand only by organizing existing facts into complete sentences and sections; do not add, infer, or repeat facts. Keep exactly the 【正文】 and 【待确认】 sections.'
        }
      ]);
      try {
        var refinementResponse = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + config.aiApiKey
          },
          body: JSON.stringify({
            model: config.aiResolvedModel,
            messages: refinementMessages,
            temperature: 0.2,
            max_tokens: 4096
          }),
          signal: controller.signal
        });
        var refinementPayload = await refinementResponse.json().catch(function () { return {}; });
        var refinementContent = refinementResponse.ok && refinementPayload.choices && refinementPayload.choices[0] && refinementPayload.choices[0].message
          ? String(refinementPayload.choices[0].message.content || '').trim()
          : '';
        if (refinementContent) {
          content = refinementContent;
          payload = refinementPayload;
        }
      } catch (refinementError) {
        // Keep the factually usable first draft if the optional richness refinement times out.
      }
    }

    var sectioned = splitSectionedOutput(content);
    var safeContent = await wxContentCheck.sanitizeText(content);
    var safeBodyText = await wxContentCheck.sanitizeText(sectioned.bodyText);
    var safeConfirmItems = [];
    for (var i = 0; i < sectioned.confirmItems.length; i += 1) {
      var confirmItem = sectioned.confirmItems[i];
      if (confirmItem === '无' || confirmItem === '无。') continue;
      safeConfirmItems.push(await wxContentCheck.sanitizeText(confirmItem));
    }
    var cleanedBody = removeUnavailableBodyFragments(safeBodyText);
    safeBodyText = cleanedBody.bodyText;
    cleanedBody.movedItems.forEach(function (item) {
      var signature = unavailableSignature(item);
      var duplicate = safeConfirmItems.some(function (existing) {
        return unavailableSignature(existing) === signature;
      });
      if (!duplicate) safeConfirmItems.push(item);
    });
    var quality = assessTextQuality(joinedSourceText, safeBodyText, data.template);
    for (var warningIndex = 0; warningIndex < quality.warnings.length; warningIndex += 1) {
      var warningText = quality.warnings[warningIndex].message;
      if (safeConfirmItems.indexOf(warningText) < 0) safeConfirmItems.push(warningText);
    }
    return {
      type: 'text',
      status: 'ok',
      resultText: safeContent,
      bodyText: safeBodyText,
      confirmText: safeConfirmItems.join('\n'),
      confirmItems: safeConfirmItems,
      quality: quality,
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
  removeUnavailableBodyFragments,
  splitSectionedOutput
};
