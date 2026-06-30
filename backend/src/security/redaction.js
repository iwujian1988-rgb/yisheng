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
    pattern: /(编号|档案号|账号|工号|客户号|记录号|病案号|住院号|门诊号|医保号|就诊卡号)[:：]?\s*[A-Za-z0-9-]{4,}/g,
    replacement: '$1：[编号]'
  },
  {
    type: 'person_name',
    pattern: /(姓名|联系人|负责人|患者)[:：]?\s*[\u4e00-\u9fa5]{2,4}/g,
    replacement: '$1：[姓名]'
  },
  {
    type: 'address',
    pattern: /(住址|地址|现住址|联系地址|家庭住址)[:：]?\s*[\u4e00-\u9fa5A-Za-z0-9-]{6,}/g,
    replacement: '$1：[地址]'
  }
];

function redactSensitiveText(text) {
  var redactedText = String(text || '');
  var hits = [];

  REDACTION_RULES.forEach(function (rule) {
    var matches = redactedText.match(rule.pattern);
    if (matches && matches.length > 0) {
      hits.push({ type: rule.type, count: matches.length });
      redactedText = redactedText.replace(rule.pattern, rule.replacement);
    }
  });

  return {
    text: redactedText,
    hits: hits,
    changed: redactedText !== String(text || '')
  };
}

module.exports = {
  redactSensitiveText
};
