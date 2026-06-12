const { request, getBaseUrl } = require('../api/client');
const { ENDPOINTS } = require('../api/endpoints');

function summarizeRedactionHits(redactionHits) {
  const hits = redactionHits || [];
  return hits.length
    ? hits.map((hit) => hit.type + ':' + hit.count).join(', ')
    : 'none';
}

function splitAiSections(resultText) {
  const text = String(resultText || '').trim();
  const bodyMarker = '【正文】';
  const confirmMarker = '【待确认】';
  const bodyStart = text.indexOf(bodyMarker);
  const confirmStart = text.indexOf(confirmMarker);

  if (confirmStart >= 0) {
    const bodyText = text
      .slice(bodyStart >= 0 ? bodyStart + bodyMarker.length : 0, confirmStart)
      .trim();
    const confirmText = text.slice(confirmStart + confirmMarker.length).trim();
    return { bodyText, confirmText };
  }

  return {
    bodyText: text.replace(bodyMarker, '').trim(),
    confirmText: '请确认正文内容是否准确，确认后再发送到电脑。'
  };
}

function callBackendAi(payload) {
  var reqData = {
    redactedText: payload.safeText || '',
    actionId: payload.actionId || ''
  };
  if (payload.mode) reqData.mode = payload.mode;
  if (payload.templateId) reqData.templateId = payload.templateId;
  if (Array.isArray(payload.messages) && payload.messages.length) {
    reqData.messages = payload.messages;
  }
  return request({
    url: ENDPOINTS.ai.assistant,
    method: 'POST',
    data: reqData
  }).then((data) => {
    const sections = splitAiSections(data.resultText || data.rawText || data.bodyText || '');
    return {
      provider: data.provider || 'backend-ai-gateway',
      resultText: data.resultText || sections.bodyText,
      bodyText: data.bodyText || sections.bodyText,
      confirmText: data.confirmText || sections.confirmText,
      raw: data
    };
  });
}

function callDevAi(payload) {
  const prompt = payload.prompt || {};
  const safeText = String(payload.safeText || '').trim();
  const hitSummary = summarizeRedactionHits(payload.redactionHits);
  const resultText = [
    '【正文】',
    safeText || '暂无可生成内容。',
    '',
    '【待确认】',
    '1. 请确认正文中的事实、时间、对象和数字是否准确。',
    '2. 请确认是否还有需要补充的信息。',
    '3. 脱敏命中：' + hitSummary
  ].join('\n');
  const sections = splitAiSections(resultText);

  return Promise.resolve({
    provider: 'dev-template-engine',
    resultText,
    bodyText: sections.bodyText,
    confirmText: sections.confirmText,
    raw: {
      promptTitle: prompt.title || payload.type || ''
    }
  });
}

function withBackendOrLocal(backendFn, localFn) {
  return getBaseUrl() ? backendFn() : localFn();
}

function callAi(payload) {
  var p = payload || {};
  return withBackendOrLocal(
    function () { return callBackendAi(p); },
    function () { return callDevAi(p); }
  );
}

module.exports = {
  callAi: callAi,
  callBackendAi: callBackendAi,
  callDevAi: callDevAi,
  withBackendOrLocal: withBackendOrLocal,
  splitAiSections: splitAiSections
};
