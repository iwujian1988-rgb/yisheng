const { prepareTextForThirdPartyAi } = require('../security/content-guard');
const { getPromptConfig, PROMPT_TYPES } = require('./prompts');
const { callAi } = require('./provider');

function generateContent(options) {
  const type = options.type || PROMPT_TYPES.CONTENT_POLISH;
  const rawText = options.text || '';
  const guarded = prepareTextForThirdPartyAi(rawText);
  const prompt = getPromptConfig(type);

  return callAi({
    type,
    prompt,
    safeText: guarded.safeText,
    redactionHits: guarded.redactionHits
  }).then((response) => {
    return {
      resultText: response.resultText,
      bodyText: response.bodyText || response.resultText || '',
      confirmText: response.confirmText || '',
      provider: response.provider,
      redactionHits: guarded.redactionHits,
      inputSummary: guarded.summary,
      requiresUserConfirm: true
    };
  });
}

function generateTemplateContent(options) {
  const template = options.template || {};
  const rawText = options.text || '';
  const guarded = prepareTextForThirdPartyAi(rawText);
  const prompt = getPromptConfig(PROMPT_TYPES.TEMPLATE_CONTENT_DRAFT);

  return callAi({
    type: PROMPT_TYPES.TEMPLATE_CONTENT_DRAFT,
    prompt,
    safeText: guarded.safeText,
    redactionHits: guarded.redactionHits,
    templateCode: template.templateCode || '',
    templateName: template.name || ''
  }).then((response) => {
    return {
      resultText: response.resultText,
      bodyText: response.bodyText || response.resultText || '',
      confirmText: response.confirmText || '',
      provider: response.provider,
      redactionHits: guarded.redactionHits,
      inputSummary: guarded.summary,
      requiresUserConfirm: true
    };
  });
}

module.exports = {
  generateContent,
  generateTemplateContent
};
