const crypto = require('crypto');

function clean(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/[‐‑‒–—]/g, '-')
    .replace(/μ/g, 'u')
    .replace(/\s+/g, ' ')
    .trim();
}

function stableId(parts) {
  return 'fact_' + crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16);
}

function normalizeDate(value) {
  var match = clean(value).match(/\b(20\d{2})[年\/.\-](\d{1,2})[月\/.\-](\d{1,2})日?\b/);
  if (!match) return '';
  return match[1] + '-' + String(match[2]).padStart(2, '0') + '-' + String(match[3]).padStart(2, '0');
}

function firstCapture(text, pattern) {
  var match = String(text || '').match(pattern);
  return match ? clean(match[1]) : '';
}

function extractMetadata(text) {
  var source = String(text || '').replace(/\r/g, ' ');
  var preliminaryDiagnosis = firstCapture(source, /(?:初步诊断|临床诊断)\s*[:：]\s*([^\n]{1,60}?)(?=\s+(?:床号|住院号|标本号|申请医生|标本质量)\s*[:：]|$)/);
  preliminaryDiagnosis = Array.from(new Set(preliminaryDiagnosis.split(/[,，、]/).map(clean).filter(Boolean))).join('、');
  return {
    patientName: firstCapture(source, /(?:患者姓名|姓名)\s*[:：]\s*(?!(?:登记号|性别|年龄|患者类型|科别|病案号|住院号|门诊号)\s*[:：])([^\s:：,，;；]{1,20})(?=\s+(?:登记号|性别|年龄|患者类型|科别|病案号|住院号|门诊号)\s*[:：]|$)/),
    sex: firstCapture(source, /性别\s*[:：]\s*(男|女|未知)/),
    age: firstCapture(source, /年龄\s*[:：]\s*(\d{1,3}\s*岁?)/),
    patientType: firstCapture(source, /患者类型\s*[:：]\s*([^\s,，;；]{1,12})/),
    registrationNo: firstCapture(source, /登记号\s*[:：]\s*([A-Za-z0-9_-]{3,30})/),
    inpatientNo: firstCapture(source, /住院号\s*[:：]\s*([A-Za-z0-9_-]{3,30})/),
    outpatientNo: firstCapture(source, /门诊号\s*[:：]\s*([A-Za-z0-9_-]{3,30})/),
    department: firstCapture(source, /科别\s*[:：]\s*([^\s,，;；]{1,20})/),
    specimenType: firstCapture(source, /标本类型\s*[:：]\s*([^\s,，;；]{1,20})/),
    preliminaryDiagnosis: preliminaryDiagnosis
  };
}

function normalizeMetadataObject(value) {
  var raw = value && typeof value === 'object' ? value : {};
  var output = {};
  Object.keys(raw).forEach(function (key) {
    var itemValue = clean(raw[key]);
    if (!itemValue) return;
    var label = clean(key);
    if (/^(?:姓名|患者姓名|patientName)$/i.test(label)) output.patientName = itemValue;
    else if (/^(?:性别|sex)$/i.test(label)) output.sex = itemValue;
    else if (/^(?:年龄|age)$/i.test(label)) output.age = itemValue;
    else if (/^(?:患者类型|病人类型|patientType)$/i.test(label)) output.patientType = itemValue;
    else if (/^(?:登记号|registrationNo)$/i.test(label)) output.registrationNo = itemValue;
    else if (/^(?:住院号|inpatientNo)$/i.test(label)) output.inpatientNo = itemValue;
    else if (/^(?:门诊号|outpatientNo)$/i.test(label)) output.outpatientNo = itemValue;
    else if (/^(?:科别|科室|department)$/i.test(label)) output.department = itemValue;
    else if (/^(?:标本类型|specimenType)$/i.test(label)) output.specimenType = itemValue;
    else if (/^(?:初步诊断|临床诊断|preliminaryDiagnosis)$/i.test(label)) {
      output.preliminaryDiagnosis = Array.from(new Set(itemValue.split(/[,，、;；]/).map(clean).filter(Boolean))).join('、');
    }
    else if (/^(?:病区|ward)$/i.test(label)) output.ward = itemValue;
    else if (/^(?:床号|bedNo)$/i.test(label)) output.bedNo = itemValue;
    else if (/^(?:标本号|specimenNo)$/i.test(label)) output.specimenNo = itemValue;
    else if (/^(?:检查项目|testItems)$/i.test(label)) output.testItems = itemValue;
    else if (/^(?:检验仪器|instrument)$/i.test(label)) output.instrument = itemValue;
    else if (/^(?:申请医生|送检医生|applicationDoctor)$/i.test(label)) output.applicationDoctor = itemValue;
  });
  return output;
}

function extractSourceDate(dates, text, explicitReportDate) {
  if (explicitReportDate) return { type: 'report', label: '报告日期', value: normalizeDate(explicitReportDate) };
  var source = dates && typeof dates === 'object' ? dates : {};
  var labels = Object.keys(source);
  var priorities = [
    { pattern: /报告日期|报告时间|report/i, type: 'report' },
    { pattern: /采样日期|采样时间|sample/i, type: 'sample' },
    { pattern: /检验日期|检测日期|test/i, type: 'test' },
    { pattern: /申请日期|申请时间|application/i, type: 'application' }
  ];
  for (var i = 0; i < priorities.length; i += 1) {
    var label = labels.find(function (item) { return priorities[i].pattern.test(item); });
    var date = label ? normalizeDate(source[label]) : '';
    if (date) return { type: priorities[i].type, label: clean(label), value: date };
  }
  var reportLabel = firstCapture(text, /(报告日期|报告时间|采样日期|采样时间|检验日期|检测日期|申请日期|申请时间)\s*[:：]\s*20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}/);
  if (!reportLabel) return { type: '', label: '', value: '' };
  var sourceDate = normalizeDate(text.match(new RegExp(reportLabel + '\\s*[:：]\\s*([^\\s]+)'))?.[1] || '');
  var type = /申请/.test(reportLabel) ? 'application' : /采样/.test(reportLabel) ? 'sample' : /检验|检测/.test(reportLabel) ? 'test' : 'report';
  return { type: type, label: reportLabel, value: sourceDate };
}

function normalizeFlag(value) {
  var text = clean(value).toLowerCase();
  if (/[↑▲]|\\uparrow|\b(high|h)\b/.test(text)) return 'high';
  if (/[↓▼]|\\downarrow|\b(low|l)\b/.test(text)) return 'low';
  return '';
}

function normalizeCode(value) {
  var code = clean(value).replace(/\s+/g, '');
  var aliases = { C1: 'Cl', TBIL: 'TBIL', DBIL: 'DBIL', IBIL: 'IBIL', GGT: 'GGT', APOA: 'APOA', APOB: 'APOB' };
  return aliases[code.toUpperCase()] || code;
}

function normalizeUnit(value) {
  return clean(value)
    .replace(/\s*\/\s*/g, '/')
    .replace(/(?:u|μ)mol\s*\/\s*[1l]/gi, 'umol/L')
    .replace(/IU\s*\/\s*[1l]/gi, 'IU/L')
    .replace(/U\s*\/\s*[1l]/gi, 'U/L');
}

function inferFlag(result, referenceRange) {
  var numeric = Number(String(result || '').replace(/[^\d.+-]/g, ''));
  var bounds = String(referenceRange || '').match(/\d+(?:\.\d+)?/g) || [];
  if (!Number.isFinite(numeric) || bounds.length < 2) return '';
  var low = Number(bounds[0]);
  var high = Number(bounds[1]);
  if (!Number.isFinite(low) || !Number.isFinite(high)) return '';
  if (numeric < low) return 'low';
  if (numeric > high) return 'high';
  return '';
}

function validateLabFactBindings(facts) {
  var issues = [];
  var seenRows = {};
  (facts || []).forEach(function (fact) {
    var rowIndex = Number(fact.rowIndex || 0);
    if (rowIndex && seenRows[rowIndex]) issues.push({ code: 'DUPLICATE_ROW', rowIndex: rowIndex });
    if (rowIndex) seenRows[rowIndex] = true;
    var code = clean(fact.code).replace(/\s+/g, '').toUpperCase();
    var name = clean(fact.name);
    var ratio = /(?:\/|比值|比例)/.test(code + name);
    if (ratio && fact.unit) {
      issues.push({ code: 'RATIO_HAS_UNIT', rowIndex: rowIndex, factId: fact.factId });
    }
    if (fact.referenceRange && !/^-?\d+(?:\.\d+)?\s*(?:--?|-|~|至)\s*-?\d+(?:\.\d+)?$/.test(fact.referenceRange)) {
      issues.push({ code: 'INVALID_REFERENCE_RANGE', rowIndex: rowIndex, factId: fact.factId });
    }
    if (fact.unit && !/^(?:%|(?:u|m|n)?mol\/L|(?:m|u)?g\/L|(?:I?U)\/L|mosm\/L|fL|pg)$/i.test(fact.unit.replace(/\s+/g, ''))) {
      issues.push({ code: 'INVALID_UNIT', rowIndex: rowIndex, factId: fact.factId });
    }
  });
  return issues;
}

function normalizeRegion(region, index) {
  var item = region && typeof region === 'object' ? region : {};
  return {
    index: Number.isFinite(Number(item.index)) ? Number(item.index) : index,
    text: clean(item.text),
    polygon: item.polygon || item.box || item.bbox || item.position || null,
    confidence: Number(item.confidence || item.score || 0)
  };
}

function rowFromObject(row, context) {
  var result = clean(row.result || row.value);
  var name = clean(row.name || row.itemName || row.item).replace(/^\*+/, '');
  if (!name || !result) return null;
  var code = normalizeCode(row.code || row.itemCode);
  if (/APOB\s*\/\s*APOA/i.test(name)) code = 'APOB/APOA';
  if (name === '氯' && /^(?:CI|C1)$/i.test(code)) code = 'Cl';
  if (!code && /^[A-Za-z][A-Za-z0-9_\-/ ]{0,16}$/.test(name)) code = normalizeCode(name);
  var referenceRange = clean(row.referenceRange || row.reference || row.range);
  var flag = normalizeFlag(row.flag || result) || inferFlag(result, referenceRange);
  result = result.replace(/[↑↓▲▼]/g, '').replace(/\$?\\(?:up|down)arrow\$?/gi, '').trim();
  return {
    factId: stableId([context.sourceId, context.pageIndex, row.rowIndex || row.rowNumber, code, name, result, row.unit, referenceRange]),
    sourceId: context.sourceId,
    pageIndex: context.pageIndex,
    rowIndex: Number(row.rowIndex || row.rowNumber || 0),
    reportDate: context.reportDate,
    dateType: context.sourceDate.type,
    dateLabel: context.sourceDate.label,
    dateValue: context.sourceDate.value,
    code: code,
    name: name,
    result: result,
    unit: normalizeUnit(row.unit),
    referenceRange: referenceRange,
    flag: flag,
    confidence: Number(row.confidence || 0)
  };
}

function parseDelimitedRow(text, rowIndex, context) {
  var line = clean(text);
  if (!line) return null;
  var parts = line.split(/\s*[|\t，,]\s*/).filter(Boolean);
  if (parts.length < 4) return null;
  var resultIndex = parts.findIndex(function (part, index) {
    return index > 0 && /^[<>≤≥]?-?\d+(?:\.\d+)?(?:\s*[↑↓▲▼])?$/.test(part);
  });
  if (resultIndex < 1) return null;
  var before = parts.slice(0, resultIndex);
  var after = parts.slice(resultIndex + 1);
  var code = before.length > 1 && /^[A-Za-z][A-Za-z0-9_\-/]{0,12}$/.test(before[0]) ? before.shift() : '';
  var name = before.join(' ');
  var result = parts[resultIndex];
  var unit = after[0] && !/^[-<>≤≥]?\d/.test(after[0]) ? after.shift() : '';
  var referenceRange = after.find(function (part) { return /\d\s*(?:-|~|至)\s*\d/.test(part); }) || '';
  return rowFromObject({
    rowIndex: rowIndex,
    code: code,
    name: name,
    result: result,
    unit: unit,
    referenceRange: referenceRange
  }, context);
}

function decodeHtml(value) {
  return clean(String(value || '')
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/<[^>]+>/g, ' '));
}

function htmlTableRows(text) {
  var rows = [];
  var rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  var rowMatch;
  while ((rowMatch = rowPattern.exec(String(text || '')))) {
    var cells = [];
    var cellPattern = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    var cellMatch;
    while ((cellMatch = cellPattern.exec(rowMatch[1]))) cells.push(decodeHtml(cellMatch[1]));
    if (cells.some(Boolean)) rows.push(cells);
  }
  return rows;
}

function factsFromTableRows(rows, context) {
  var headerIndex = rows.findIndex(function (cells) {
    var joined = cells.join('|');
    return /(?:项目|名称)/.test(joined) && /(?:结果|数值)/.test(joined) && /(?:参考|区间)/.test(joined);
  });
  if (headerIndex < 0) return [];
  var headers = rows[headerIndex];
  function indexOf(pattern) { return headers.findIndex(function (cell) { return pattern.test(cell); }); }
  var indexes = {
    code: indexOf(/编码|代码|英文缩写/),
    name: indexOf(/项目名称|名称|项目/),
    result: indexOf(/结果|数值/),
    unit: indexOf(/单位/),
    referenceRange: indexOf(/参考值|参考区间|参考范围/)
  };
  // "item code" and "item name" often both contain the generic item token.
  // Prefer the column between code and result when the broad match picked code twice.
  if (indexes.name === indexes.code && indexes.code >= 0 && indexes.result > indexes.code + 1) {
    indexes.name = indexes.code + 1;
  }
  return rows.slice(headerIndex + 1).map(function (cells, offset) {
    var resultIndex = cells.findIndex(function (cell, index) {
      return index > 0 && /^[<>≤≥]?-?\d+(?:\.\d+)?(?:\s*(?:↑|↓|▲|▼|\\uparrow|\\downarrow|\$))*/i.test(clean(cell));
    });
    if (resultIndex < 0) resultIndex = indexes.result;
    var before = cells.slice(0, resultIndex).filter(Boolean);
    if (before.length && /^\d+$/.test(before[0])) before.shift();
    var inferredCode = before.length > 1 && /^[A-Za-zα-ωΑ-Ω$\\][A-Za-z0-9_\-/ α-ωΑ-Ω$\\]{0,20}$/.test(before[0]) ? before.shift() : '';
    var inferredName = before.join(' ');
    var after = cells.slice(resultIndex + 1);
    var inferredUnit = after.find(function (cell) { return /(?:mol|g|L|U|IU|mosm|%|fL|pg)\b/i.test(clean(cell)); }) || '';
    var inferredRange = after.find(function (cell) { return /\d\s*(?:--?|-|~|至)\s*\d/.test(clean(cell)); }) || '';
    var result = resultIndex >= 0 ? cells[resultIndex] : '';
    return rowFromObject({
      rowIndex: offset + 1,
      code: inferredCode || (indexes.code >= 0 ? cells[indexes.code] : ''),
      name: inferredName || (indexes.name >= 0 ? cells[indexes.name] : ''),
      result: result,
      unit: inferredUnit || (indexes.unit >= 0 ? cells[indexes.unit] : ''),
      referenceRange: inferredRange || (indexes.referenceRange >= 0 ? cells[indexes.referenceRange] : ''),
      flag: result
    }, context);
  }).filter(Boolean);
}

function markdownTableRows(text) {
  return String(text || '').split(/\r?\n/).map(function (line) {
    var value = line.trim();
    if (!value || value.indexOf('|') < 0 || /^\|?\s*:?-{2,}/.test(value)) return null;
    return value.replace(/^\|/, '').replace(/\|$/, '').split('|').map(clean);
  }).filter(Boolean);
}

function tableFacts(text, context) {
  var facts = factsFromTableRows(htmlTableRows(text), context);
  if (facts.length) return facts;
  return factsFromTableRows(markdownTableRows(text), context);
}

function buildStructuredDocument(input) {
  var payload = input && typeof input === 'object' ? input : {};
  var sourceId = clean(payload.sourceId) || 'source_unknown';
  var pageIndex = Number(payload.pageIndex || 0);
  var text = String(payload.text || '');
  var embedded = {};
  try { embedded = JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()); } catch (_error) { embedded = {}; }
  var dates = payload.dates && Object.keys(payload.dates).length ? payload.dates : embedded.dates;
  var metadata = payload.metadata && Object.keys(payload.metadata).length ? payload.metadata : embedded.metadata;
  var sourceDate = extractSourceDate(dates, text, payload.reportDate);
  var reportDate = sourceDate.type === 'report' ? sourceDate.value : '';
  var context = { sourceId: sourceId, pageIndex: pageIndex, reportDate: reportDate, sourceDate: sourceDate };
  var regions = (Array.isArray(payload.regions) ? payload.regions : []).map(normalizeRegion);
  var candidateRows = Array.isArray(payload.rows) && payload.rows.length ? payload.rows : (Array.isArray(embedded.rows) ? embedded.rows : []);
  var facts = candidateRows.map(function (row) { return rowFromObject(row, context); }).filter(Boolean);
  if (!facts.length && (/<table[\s>]/i.test(text) || /\|[^\n]+\|/.test(text))) facts = tableFacts(text, context);
  if (!facts.length) {
    facts = text.split(/\r?\n/).map(function (line, index) {
      return parseDelimitedRow(line, index, context);
    }).filter(Boolean);
  }
  var uncertainRows = [];
  facts = facts.filter(function (fact) {
    var complete = Boolean(fact.name && fact.result && fact.sourceId);
    if (!complete) uncertainRows.push(fact);
    return complete;
  });
  var bindingIssues = validateLabFactBindings(facts);
  if (bindingIssues.length) {
    uncertainRows = uncertainRows.concat(bindingIssues);
  }
  return {
    documentType: facts.length ? 'lab_report' : 'unknown',
    reportDate: reportDate,
    sourceDate: sourceDate,
    metadata: Object.assign({}, extractMetadata(text), normalizeMetadataObject(metadata)),
    facts: facts,
    uncertainRows: uncertainRows,
    qualityIssues: bindingIssues,
    regions: regions
  };
}

module.exports = {
  buildStructuredDocument: buildStructuredDocument,
  htmlTableRows: htmlTableRows,
  markdownTableRows: markdownTableRows,
  normalizeDate: normalizeDate,
  normalizeFlag: normalizeFlag,
  extractMetadata: extractMetadata
  ,extractSourceDate: extractSourceDate
  ,validateLabFactBindings: validateLabFactBindings
};
