const CRITICAL_TOKEN_RE = /\d+(?:\.\d+)?\s*(?:mmHg|mmol\/L|μmol\/L|mg\/dL|ng\/mL|IU\/L|U\/L|mL\/min|kg|cm|mg|g|ml|mL|℃|°C|次\/分|次\/分钟|天|周|月|年|小时|分)/gi;
const POLARITY_TERMS = ['否认', '未见', '无', '没有', '疑似', '考虑', '待排', '可能', '不详', '未知'];

function normalize(value) {
  return String(value || '').replace(/\s+/g, '').toLowerCase();
}

function unique(values) {
  return values.filter(function (item, index) { return values.indexOf(item) === index; });
}

function meaningfulLength(value) {
  return String(value || '').replace(/[\s\p{P}\p{S}]/gu, '').length;
}

function assessTextQuality(sourceText, bodyText, template) {
  var source = String(sourceText || '');
  var body = String(bodyText || '');
  var normalizedBody = normalize(body);
  var criticalTokens = unique(source.match(CRITICAL_TOKEN_RE) || []);
  var missingTokens = criticalTokens.filter(function (token) { return normalizedBody.indexOf(normalize(token)) < 0; });
  var missingPolarity = POLARITY_TERMS.filter(function (term) {
    return source.indexOf(term) >= 0 && body.indexOf(term) < 0;
  });
  var warnings = [];
  if (missingTokens.length) {
    warnings.push({ code: 'CRITICAL_VALUE_MISSING', message: '部分数值、单位或时间未在草稿中完整出现，请对照原材料核对。', examples: missingTokens.slice(0, 6) });
  }
  if (missingPolarity.length) {
    warnings.push({ code: 'POLARITY_MISSING', message: '部分否定或不确定表达未在草稿中完整保留，请重点核对。', examples: missingPolarity.slice(0, 6) });
  }
  var blueprint = template && (template.writingBlueprint || template.writing_blueprint) || {};
  var lengthPolicy = blueprint.lengthPolicy || {};
  var sourceChars = meaningfulLength(source);
  var bodyChars = meaningfulLength(body);
  var minimumSourceChars = Number(lengthPolicy.minimumSourceChars || 0);
  var minimumBodyChars = Number(lengthPolicy.minimumBodyChars || 0);
  var minimumRatio = Number(lengthPolicy.minimumBodyToSourceRatio || 0);
  var expansionRatio = sourceChars ? Number((bodyChars / sourceChars).toFixed(2)) : 0;
  var richnessThin = sourceChars >= minimumSourceChars
    && ((minimumRatio > 0 && expansionRatio < minimumRatio) || (minimumBodyChars > 0 && bodyChars < minimumBodyChars));
  var contract = template && (template.generationContract || template.generation_contract) || {};
  var sections = Array.isArray(contract.sections) ? contract.sections : [];
  return {
    status: warnings.length ? 'needs_review' : 'passed',
    warnings: warnings,
    sourceCharCount: sourceChars,
    bodyCharCount: bodyChars,
    expansionRatio: expansionRatio,
    richness: {
      status: richnessThin ? 'thin' : 'adequate',
      minimumBodyChars: minimumBodyChars,
      minimumBodyToSourceRatio: minimumRatio
    },
    criticalTokenCount: criticalTokens.length,
    matchedSectionCount: sections.filter(function (section) { return body.indexOf(section) >= 0; }).length,
    contractSectionCount: sections.length
  };
}

module.exports = { assessTextQuality };
