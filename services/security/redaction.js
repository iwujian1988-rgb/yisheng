const REDACTION_RULES = [
  {
    type: 'phone',
    pattern: /1[3-9]\d{9}/g,
    replacement: '[手机号]'
  },
  {
    type: 'id_card',
    pattern: /\d{6}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]/g,
    replacement: '[证件号]'
  },
  {
    type: 'record_no',
    pattern: /(编号|档案号|账号|工号|客户号|记录号)[:：]?\s*[A-Za-z0-9-]{4,}/g,
    replacement: '$1：[编号]'
  },
  {
    type: 'person_name',
    pattern: /(姓名|联系人|负责人)[:：]?\s*[\u4e00-\u9fa5]{2,4}/g,
    replacement: '$1：[姓名]'
  },
  {
    type: 'address',
    pattern: /(住址|地址|现住址|联系地址)[:：]?\s*[\u4e00-\u9fa5A-Za-z0-9-]{6,}/g,
    replacement: '$1：[地址]'
  }
];

function redactSensitiveText(text) {
  let redactedText = text || '';
  const hits = [];

  REDACTION_RULES.forEach((rule) => {
    const matches = redactedText.match(rule.pattern);
    if (matches && matches.length > 0) {
      hits.push({
        type: rule.type,
        count: matches.length
      });
      redactedText = redactedText.replace(rule.pattern, rule.replacement);
    }
  });

  return {
    text: redactedText,
    hits,
    changed: redactedText !== (text || '')
  };
}

function createSafeTextSummary(text) {
  const safeText = text || '';
  return {
    length: safeText.length,
    hasContent: safeText.length > 0
  };
}

module.exports = {
  REDACTION_RULES,
  redactSensitiveText,
  createSafeTextSummary
};
