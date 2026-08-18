const CRITICAL_TOKEN_RE = /\d+(?:\.\d+)?\s*(?:mmHg|mmol\/L|μmol\/L|mg\/dL|ng\/mL|IU\/L|U\/L|mL\/min|kg|cm|mg|g|ml|mL|℃|°C|次\/分|次\/分钟|天|周|月|年|小时|分)/gi;
const POLARITY_TERMS = ['否认', '未见', '无', '没有', '疑似', '考虑', '待排', '可能', '不详', '未知'];

function normalize(value) {
  return String(value || '').replace(/μ/g, 'u').replace(/\s+/g, '').toLowerCase();
}

function normalizeLoose(value) {
  return normalize(value).replace(/[\p{P}\p{S}]/gu, '');
}

function unique(values) {
  return values.filter(function (item, index) { return values.indexOf(item) === index; });
}

function meaningfulLength(value) {
  return String(value || '').replace(/[\s\p{P}\p{S}]/gu, '').length;
}

function sectionHasContent(bodyText, section, allSections) {
  var lines = String(bodyText || '').split(/\r?\n/);
  var start = lines.findIndex(function (line) { return line.trim().replace(/^#+\s*/, '') === String(section); });
  if (start < 0) return false;
  for (var index = start + 1; index < lines.length; index += 1) {
    var value = lines[index].trim().replace(/^#+\s*/, '');
    if ((allSections || []).indexOf(value) >= 0) break;
    if (lines[index].trim()) return true;
  }
  return false;
}

function sourceBlocks(sourceText) {
  var source = String(sourceText || '');
  var blocks = [];
  var pattern = /【([^】]+)】\s*\n([\s\S]*?)(?=\n\n【|$)/g;
  var match;
  while ((match = pattern.exec(source))) blocks.push({ source: match[1], text: match[2] });
  return blocks.length ? blocks : [{ source: '输入材料', text: source }];
}

function confirmedValueFor(rule, confirmedFields) {
  var field = (confirmedFields || []).find(function (item) {
    var label = String(item && item.label || '');
    var key = String(item && item.key || '').toLowerCase();
    return label.indexOf(rule.label) >= 0 || key.split(/[._]/).indexOf(rule.key) >= 0;
  });
  return field && String(field.value || '').trim();
}

function detectSourceConflicts(sourceText, confirmedFields) {
  var blocks = sourceBlocks(sourceText);
  var conflicts = [];
  var resolved = [];
  [
    { key: 'name', label: '姓名', pattern: /(?:患者)?姓名\s*[:：]\s*([^\s，。；;\n【】]{1,20})/g },
    { key: 'sex', label: '性别', pattern: /性别\s*[:：]\s*([^\s，。；;\n【】]{1,8})/g },
    { key: 'age', label: '年龄', pattern: /年龄\s*[:：]\s*([^\s，。；;\n【】]{1,12})/g },
    { key: 'record_id', label: '患者编号', pattern: /(?:病案号|患者编号|门诊号|住院号)\s*[:：]\s*([^\s，。；;\n【】]{1,30})/g }
  ].forEach(function (rule) {
    var candidates = [];
    blocks.forEach(function (block) {
      var match;
      rule.pattern.lastIndex = 0;
      while ((match = rule.pattern.exec(block.text))) {
        var value = String(match[1] || '').trim();
        if (value && !candidates.some(function (item) { return item.value === value && item.source === block.source; })) {
          candidates.push({ value: value, source: block.source });
        }
      }
    });
    var values = unique(candidates.map(function (item) { return item.value; }));
    if (values.length > 1) {
      var confirmed = confirmedValueFor(rule, confirmedFields);
      if (confirmed) resolved.push({ key: rule.key, label: rule.label, adoptedValue: confirmed, candidates: candidates });
      else conflicts.push({ key: rule.key, label: rule.label, candidates: candidates });
    }
  });

  var labAliases = {
    wbc: 'WBC', '白细胞计数': 'WBC', rbc: 'RBC', '红细胞计数': 'RBC',
    hgb: 'HGB', hb: 'HGB', '血红蛋白': 'HGB', plt: 'PLT', '血小板计数': 'PLT',
    crp: 'CRP', 'c-反应蛋白': 'CRP'
  };
  var labGroups = {};
  blocks.forEach(function (block) {
    var dateMatch = block.text.match(/\b(20\d{2}[-/.]\d{1,2}[-/.]\d{1,2})\b/);
    if (!dateMatch) return;
    var metricPattern = /(WBC|RBC|HGB|Hb|PLT|CRP|白细胞计数|红细胞计数|血红蛋白|血小板计数|C-反应蛋白)\s*(?:\([^)]*\))?\s*[:：]?\s*[<＞>《]?\s*(\d+(?:\.\d+)?)/gi;
    var metricMatch;
    while ((metricMatch = metricPattern.exec(block.text))) {
      var metric = labAliases[String(metricMatch[1]).toLowerCase()] || labAliases[metricMatch[1]] || String(metricMatch[1]).toUpperCase();
      var groupKey = dateMatch[1].replace(/[/.]/g, '-') + '|' + metric;
      if (!labGroups[groupKey]) labGroups[groupKey] = [];
      labGroups[groupKey].push({ value: metricMatch[2], source: block.source, correction: block.source.indexOf('人工纠正') >= 0 });
    }
  });
  Object.keys(labGroups).forEach(function (groupKey) {
    var candidates = labGroups[groupKey];
    var values = unique(candidates.map(function (item) { return item.value; }));
    if (values.length < 2) return;
    var correction = candidates.filter(function (item) { return item.correction; }).slice(-1)[0];
    var parts = groupKey.split('|');
    if (correction) resolved.push({ key: groupKey, label: parts[0] + ' ' + parts[1], adoptedValue: correction.value, candidates: candidates });
    else conflicts.push({ key: groupKey, label: parts[0] + ' ' + parts[1], candidates: candidates });
  });
  return { unresolved: conflicts, resolved: resolved };
}

function detectStructuredFactConflicts(facts) {
  var groups = {};
  (Array.isArray(facts) ? facts : []).forEach(function (fact) {
    if (!fact || !fact.result) return;
    var itemKey = normalize(fact.code || fact.name).replace(/[^a-z0-9\u4e00-\u9fff]/g, '');
    var dateKey = String(fact.dateType || (fact.reportDate ? 'report' : 'none')) + '|' + String(fact.dateValue || fact.reportDate || '');
    var key = dateKey + '|' + itemKey;
    if (!groups[key]) groups[key] = [];
    groups[key].push(fact);
  });
  return Object.keys(groups).reduce(function (all, key) {
    var entries = groups[key];
    var signatures = unique(entries.map(function (fact) {
      return [fact.result, fact.unit, fact.referenceRange, fact.flag].map(normalize).join('|');
    }));
    var sourceIds = unique(entries.map(function (fact) { return String(fact.sourceId || 'source_unknown'); }));
    if (signatures.length > 1 && sourceIds.length > 1) {
      all.push({
        type: 'lab_tuple', label: entries[0].name || entries[0].code,
        dateType: entries[0].dateType || '', dateValue: entries[0].dateValue || entries[0].reportDate || '',
        candidates: entries.map(function (fact) {
          return { value: [fact.result, fact.unit, fact.referenceRange, fact.flag].filter(Boolean).join(' | '), source: String(fact.sourceId || 'source_unknown'), factId: fact.factId };
        })
      });
    }
    return all;
  }, []);
}

function factValuePresent(segment, value) {
  if (!String(value || '').trim()) return true;
  return normalize(segment).indexOf(normalize(value)) >= 0;
}

function findRenderedFactLine(searchableBody, fact) {
  var name = String(fact && fact.name || '').replace(/^\*+/, '').trim();
  var code = String(fact && fact.code || '').trim();
  var exactLabel = code && name.toLowerCase() !== code.toLowerCase() ? name + '（' + code + '）' : name;
  var offset = 0;
  var lines = String(searchableBody || '').split('\n');
  for (var index = 0; index < lines.length; index += 1) {
    var line = lines[index];
    var content = line.replace(/^\s*\d+\.\s*/, '');
    if (content.indexOf(exactLabel + '：') === 0) return { segment: line, offset: offset + line.indexOf(exactLabel) };
    offset += line.length + 1;
  }
  return null;
}

function assessStructuredFacts(bodyText, structuredFacts) {
  var body = String(bodyText || '');
  var facts = Array.isArray(structuredFacts) ? structuredFacts : [];
  var hardErrors = [];
  var usedFactIds = [];
  var sourceIds = unique(facts.map(function (fact) { return String(fact && fact.sourceId || 'source_unknown'); }));
  facts.forEach(function (fact) {
    if (!fact || !fact.factId || !fact.name || !fact.result) return;
    var sourceNumber = sourceIds.indexOf(String(fact.sourceId || 'source_unknown')) + 1;
    var sourceMarker = '来源' + sourceNumber + '（';
    var sourceStart = body.indexOf(sourceMarker);
    var nextSourceStart = sourceStart >= 0 ? body.indexOf('来源' + (sourceNumber + 1) + '（', sourceStart + sourceMarker.length) : -1;
    var searchableStart = sourceStart >= 0 ? sourceStart : 0;
    var searchableEnd = nextSourceStart >= 0 ? nextSourceStart : body.length;
    var searchableBody = body.slice(searchableStart, searchableEnd);
    var located = findRenderedFactLine(searchableBody, fact);
    if (!located) {
      hardErrors.push({ code: 'LAB_FACT_MISSING', factId: fact.factId, sourceId: fact.sourceId, message: '检验项目未写入结果：' + fact.name });
      return;
    }
    var nameIndex = searchableStart + located.offset;
    var segment = located.segment;
    var missingParts = ['result', 'unit', 'referenceRange'].filter(function (key) { return !factValuePresent(segment, fact[key]); });
    if (missingParts.length) {
      hardErrors.push({ code: 'LAB_TUPLE_BROKEN', factId: fact.factId, sourceId: fact.sourceId, missing: missingParts, message: '检验项目与结果信息未保持绑定：' + fact.name });
      return;
    }
    if (fact.flag === 'high' && !/[↑▲]|(?:升高|偏高|高于)/.test(segment)) {
      hardErrors.push({ code: 'LAB_FLAG_MISSING', factId: fact.factId, sourceId: fact.sourceId, message: '异常升高标志遗漏：' + fact.name });
      return;
    }
    if (fact.flag === 'low' && !/[↓▼]|(?:降低|偏低|低于)/.test(segment)) {
      hardErrors.push({ code: 'LAB_FLAG_MISSING', factId: fact.factId, sourceId: fact.sourceId, message: '异常降低标志遗漏：' + fact.name });
      return;
    }
    var sourceHeadingIndex = body.lastIndexOf('来源', nameIndex);
    var dateContext = body.slice(Math.max(0, sourceHeadingIndex), nameIndex + 1);
    var sourceDateValue = fact.dateValue || fact.reportDate || '';
    var sourceDateLabel = fact.dateLabel || (fact.reportDate ? '报告日期' : '');
    if (sourceDateValue && (!factValuePresent(dateContext, sourceDateValue) || (sourceDateLabel && !factValuePresent(dateContext, sourceDateLabel)))) {
      hardErrors.push({ code: 'LAB_DATE_MISSING', factId: fact.factId, sourceId: fact.sourceId, message: '报告日期未与检验事实一起保留：' + fact.name });
      return;
    }
    if (!sourceDateValue && !/(日期未提供|日期不详|报告日期未提供)/.test(dateContext)) {
      hardErrors.push({ code: 'LAB_DATE_SOURCE_MISMATCH', factId: fact.factId, sourceId: fact.sourceId, message: '无日期报告被错误关联日期：' + fact.name });
      return;
    }
    usedFactIds.push(fact.factId);
  });
  return { hardErrors: hardErrors, usedFactIds: usedFactIds };
}

function assessRequiredSourceFacts(bodyText, requiredSourceFacts) {
  var normalizedBody = normalizeLoose(bodyText);
  return (Array.isArray(requiredSourceFacts) ? requiredSourceFacts : []).filter(function (fact) {
    if (!fact || !String(fact.value || '').trim()) return false;
    var sourceScoped = ['specimenType', 'specimenNo', 'testItems', 'instrument', 'applicationDoctor'].indexOf(String(fact.key || '')) >= 0;
    if (!sourceScoped) return normalizedBody.indexOf(normalizeLoose(fact.value)) < 0;
    var label = Number(fact.sourceIndex || 0) ? ('报告表头补充（来源' + Number(fact.sourceIndex) + '）') : '';
    var start = label ? String(bodyText || '').indexOf(label) : -1;
    var end = start >= 0 ? String(bodyText || '').indexOf('\n', start) : -1;
    var scopedLine = start >= 0 ? String(bodyText || '').slice(start, end >= 0 ? end : undefined) : '';
    return normalizeLoose(scopedLine).indexOf(normalizeLoose(fact.value)) < 0;
  }).map(function (fact) {
    return {
      code: 'SOURCE_HEADER_FACT_MISSING',
      key: String(fact.key || ''),
      label: String(fact.label || fact.key || '报告表头事实'),
      value: String(fact.value || ''),
      sourceId: String(fact.sourceId || ''),
      message: '报告表头中的明确事实未写入正文：' + String(fact.label || fact.key || '')
    };
  });
}

function assessTextQuality(sourceText, bodyText, template, confirmedFields, context) {
  var source = String(sourceText || '');
  var body = String(bodyText || '');
  var normalizedBody = normalize(body);
  var criticalTokens = unique(source.match(CRITICAL_TOKEN_RE) || []);
  var missingTokens = criticalTokens.filter(function (token) { return normalizedBody.indexOf(normalize(token)) < 0; });
  var missingPolarity = POLARITY_TERMS.filter(function (term) {
    return source.indexOf(term) >= 0 && body.indexOf(term) < 0;
  });
  var warnings = [];
  var structuredReview = assessStructuredFacts(body, context && context.structuredFacts);
  structuredReview.hardErrors = structuredReview.hardErrors.concat(assessRequiredSourceFacts(body, context && context.requiredSourceFacts));
  if (missingTokens.length) {
    warnings.push({ code: 'CRITICAL_VALUE_MISSING', message: '部分数值、单位或时间未在草稿中完整出现，请对照原材料核对。', examples: missingTokens.slice(0, 6) });
  }
  if (missingPolarity.length) {
    warnings.push({ code: 'POLARITY_MISSING', message: '部分否定或不确定表达未在草稿中完整保留，请重点核对。', examples: missingPolarity.slice(0, 6) });
  }
  var missingConfirmedFields = (Array.isArray(confirmedFields) ? confirmedFields : []).filter(function (field) {
    return field && String(field.value || '').trim() && normalizedBody.indexOf(normalize(field.value)) < 0;
  }).map(function (field) { return String(field.label || field.key || '已确认字段'); });
  if (missingConfirmedFields.length) {
    warnings.push({ code: 'CONFIRMED_FIELD_MISSING', message: '部分用户已确认字段未出现在草稿中，请核对后重新生成。', examples: missingConfirmedFields.slice(0, 6) });
  }
  var conflictReview = detectSourceConflicts(source, confirmedFields);
  var sourceConflicts = conflictReview.unresolved.concat(detectStructuredFactConflicts(context && context.structuredFacts));
  if (sourceConflicts.length) {
    warnings.push({
      code: 'SOURCE_CONFLICT',
      message: '不同材料中的关键事实存在冲突，未确认前不得合并为同一事实。',
      examples: sourceConflicts.map(function (item) {
        return item.label + '：' + item.candidates.map(function (candidate) { return candidate.value + '（' + candidate.source + '）'; }).join(' / ');
      }).slice(0, 6)
    });
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
  var matchedSections = sections.filter(function (section) { return sectionHasContent(body, section, sections); });
  var missingSections = sections.filter(function (section) { return matchedSections.indexOf(section) < 0; });
  return {
    status: structuredReview.hardErrors.length || warnings.length ? 'needs_review' : 'passed',
    hardErrors: structuredReview.hardErrors,
    usedFactIds: structuredReview.usedFactIds,
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
    matchedSectionCount: matchedSections.length,
    contractSectionCount: sections.length,
    matchedSections: matchedSections,
    missingSections: missingSections,
    missingConfirmedFields: missingConfirmedFields,
    sourceConflicts: sourceConflicts,
    resolvedSourceConflicts: conflictReview.resolved
  };
}

module.exports = { assessRequiredSourceFacts, assessStructuredFacts, assessTextQuality, detectStructuredFactConflicts };
