const MARKER = '[[STRUCTURED_FACTS]]';
const END_MARKER = '[[/STRUCTURED_FACTS]]';

function clean(value) {
  return String(value === null || value === undefined ? '' : value).trim();
}

function loose(value) {
  return clean(value).replace(/[\s\p{P}\p{S}]/gu, '').toLowerCase();
}

function materializeRequiredSourceFacts(bodyText, requiredFacts, structuredFacts) {
  var body = String(bodyText || '').trim();
  var normalizedBody = loose(body);
  var sourceScopedKeys = ['specimenType', 'specimenNo', 'testItems', 'instrument', 'applicationDoctor'];
  var missing = (Array.isArray(requiredFacts) ? requiredFacts : []).filter(function (fact) {
    if (!fact || !clean(fact.value)) return false;
    if (sourceScopedKeys.indexOf(String(fact.key || '')) < 0) return normalizedBody.indexOf(loose(fact.value)) < 0;
    var sourceIndex = Number(fact.sourceIndex || 0);
    var scopedLabel = sourceIndex ? ('报告表头补充（来源' + sourceIndex + '）') : '';
    var scopedStart = scopedLabel ? body.indexOf(scopedLabel) : -1;
    var scopedEnd = scopedStart >= 0 ? body.indexOf('\n', scopedStart) : -1;
    var scopedLine = scopedStart >= 0 ? body.slice(scopedStart, scopedEnd >= 0 ? scopedEnd : body.length) : '';
    return loose(scopedLine).indexOf(loose(fact.value)) < 0;
  });
  if (!missing.length) return body;
  var diagnosisFacts = missing.filter(function (fact) {
    return fact && (fact.certainty === 'preliminary' || /diagnosis/i.test(String(fact.key || '')));
  });
  missing = missing.filter(function (fact) { return diagnosisFacts.indexOf(fact) < 0; });
  var sourceOrder = [];
  (Array.isArray(structuredFacts) ? structuredFacts : []).forEach(function (fact) {
    var sourceId = clean(fact && fact.sourceId) || 'source_unknown';
    if (sourceOrder.indexOf(sourceId) < 0) sourceOrder.push(sourceId);
  });
  var grouped = {};
  missing.forEach(function (fact) {
    var sourceId = clean(fact.sourceId) || 'source_unknown';
    if (!grouped[sourceId]) grouped[sourceId] = [];
    grouped[sourceId].push(fact);
  });
  var lines = Object.keys(grouped).map(function (sourceId) {
    var declaredIndex = Number(grouped[sourceId][0] && grouped[sourceId][0].sourceIndex || 0);
    var sourceNumber = declaredIndex || sourceOrder.indexOf(sourceId) + 1;
    var sourceLabel = sourceNumber > 0 ? ('来源' + sourceNumber) : '对应来源';
    return '报告表头补充（' + sourceLabel + '）：' + grouped[sourceId].map(function (fact) {
      return clean(fact.label || fact.key) + '：' + clean(fact.value);
    }).join('；') + '。';
  });
  var line = lines.join('\n');
  var labIndex = body.indexOf('\n检验结果');
  if (line) body = labIndex >= 0 ? body.slice(0, labIndex) + '\n' + line + body.slice(labIndex) : body + '\n\n' + line;
  if (diagnosisFacts.length) {
    var diagnosisLines = diagnosisFacts.map(function (fact) {
      return (fact.certainty === 'preliminary' ? '\u521d\u6b65\u8bca\u65ad' : clean(fact.label || fact.key)) + '\uff1a' + clean(fact.value) + '\u3002';
    }).join('\n');
    var headingPattern = /(^|\n)(?:\u8bca\u65ad\u7ed3\u8bba|\u521d\u6b65\u8bca\u65ad|\u8bca\u65ad)\s*(?:\n|$)/;
    if (headingPattern.test(body)) {
      body = body.replace(headingPattern, function (match) { return match + diagnosisLines + '\n'; });
    } else {
      body += (body ? '\n\n' : '') + '\u8bca\u65ad\u7ed3\u8bba\n' + diagnosisLines;
    }
  }
  return body.trim();
}

function factLabel(fact) {
  var name = clean(fact.name).replace(/^\*+/, '');
  var code = clean(fact.code);
  if (!code || name.toLowerCase() === code.toLowerCase()) return name || code;
  return name + '（' + code + '）';
}

function renderStructuredFacts(facts) {
  var groups = [];
  var groupByKey = {};
  (Array.isArray(facts) ? facts : []).forEach(function (fact) {
    if (!fact || !fact.name || !fact.result) return;
    var sourceId = clean(fact.sourceId) || 'source_unknown';
    var date = clean(fact.dateValue || fact.reportDate);
    var dateLabel = clean(fact.dateLabel) || (fact.reportDate ? '报告日期' : '日期');
    var key = sourceId + '|' + dateLabel + '|' + date;
    if (!groupByKey[key]) {
      groupByKey[key] = { sourceId: sourceId, dateLabel: dateLabel, dateValue: date, facts: [] };
      groups.push(groupByKey[key]);
    }
    groupByKey[key].facts.push(fact);
  });
  if (!groups.length) return '';
  var lines = ['检验结果'];
  groups.forEach(function (group, groupIndex) {
    lines.push('来源' + (groupIndex + 1) + '（' + (group.dateValue ? (group.dateLabel + '：' + group.dateValue) : '日期未提供') + '）');
    group.facts.forEach(function (fact, index) {
      var result = clean(fact.result) + (fact.unit ? (' ' + clean(fact.unit)) : '');
      var details = [];
      if (fact.referenceRange) details.push('参考范围' + clean(fact.referenceRange));
      if (fact.flag === 'high') details.push('↑');
      if (fact.flag === 'low') details.push('↓');
      lines.push((index + 1) + '. ' + factLabel(fact) + '：' + result + (details.length ? ('（' + details.join('，') + '）') : ''));
    });
  });
  return lines.join('\n');
}

function materializeStructuredFacts(bodyText, facts) {
  var body = String(bodyText || '').trim();
  var block = renderStructuredFacts(facts);
  if (!block) return body.split(MARKER).join('').split(END_MARKER).join('').trim();
  var start = body.indexOf(MARKER);
  var end = start >= 0 ? body.indexOf(END_MARKER, start + MARKER.length) : -1;
  if (start >= 0 && end >= 0) {
    var before = body.slice(0, start).split(/\r?\n/);
    while (before.length && !before[before.length - 1].trim()) before.pop();
    if (before.length && /(?:20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}|标本类型).*(?:检验|检查|化验|生化)|(?:检验|检查|化验|生化).*(?:20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}|标本类型)/.test(before[before.length - 1])) before.pop();
    while (before.length && !before[before.length - 1].trim()) before.pop();
    return (before.join('\n') + (before.length ? '\n' : '') + block + body.slice(end + END_MARKER.length)).split(MARKER).join('').split(END_MARKER).join('').trim();
  }
  if (start >= 0) return body.replace(MARKER, block).split(MARKER).join('').split(END_MARKER).join('').trim();
  return (body ? body + '\n\n' : '') + block;
}

module.exports = {
  MARKER: MARKER,
  END_MARKER: END_MARKER,
  materializeStructuredFacts: materializeStructuredFacts,
  materializeRequiredSourceFacts: materializeRequiredSourceFacts,
  renderStructuredFacts: renderStructuredFacts
};
