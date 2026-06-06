const TEMPLATE_RESULT_KEY = 'templateResultDraft';

function normalizeFields(fields) {
  return (fields || []).map((field) => {
    return Object.assign({}, field, {
      value: String(field.value || '').trim()
    });
  });
}

function getMissingRequiredFields(fields) {
  return normalizeFields(fields).filter((field) => {
    return field.required && !field.value;
  });
}

function renderTemplateFields(title, fields) {
  const lines = [];
  if (title) {
    lines.push(title);
  }

  normalizeFields(fields).forEach((field) => {
    const label = field.label || field.key || '';
    if (label && field.value) {
      lines.push(label + '：' + field.value);
    }
  });

  return lines.join('\n');
}

function buildConfirmText(fields) {
  const missing = getMissingRequiredFields(fields);
  if (!missing.length) {
    return '请确认正文内容是否准确，确认后再发送到电脑。';
  }
  return missing.map((field, index) => {
    return (index + 1) + '. 请补充或确认：' + (field.label || field.key);
  }).join('\n');
}

function saveTemplateResult(result) {
  const resultText = result && (result.resultText || result.bodyText || result.rawText)
    ? (result.resultText || result.bodyText || result.rawText)
    : '';
  const nextResult = {
    bodyText: result && result.bodyText ? result.bodyText : resultText,
    resultText,
    confirmText: result && result.confirmText ? result.confirmText : '',
    rawText: result && result.rawText ? result.rawText : resultText,
    provider: result && result.provider ? result.provider : 'template-engine',
    source: result && result.source ? result.source : 'template',
    updatedAt: Date.now()
  };
  wx.setStorageSync(TEMPLATE_RESULT_KEY, nextResult);
  return nextResult;
}

function consumeTemplateResult() {
  const result = wx.getStorageSync(TEMPLATE_RESULT_KEY);
  wx.removeStorageSync(TEMPLATE_RESULT_KEY);
  return result && (result.bodyText || result.resultText || result.rawText) ? result : null;
}

module.exports = {
  buildConfirmText,
  getMissingRequiredFields,
  normalizeFields,
  renderTemplateFields,
  saveTemplateResult,
  consumeTemplateResult
};
