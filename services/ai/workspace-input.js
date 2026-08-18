function normalize(value) {
  return String(value === undefined || value === null ? '' : value).trim();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractFieldUpdates(text, fields) {
  var source = normalize(text);
  var updates = [];
  (fields || []).forEach(function (field) {
    var label = normalize(field && field.label);
    var key = normalize(field && field.key) || label;
    if (!label || !key) return;
    var escaped = escapeRegExp(label);
    var patterns = [
      new RegExp('(?:把|将)?' + escaped + '(?:修改|改成|改为|换成|替换为|更正为|填写为|是|为|[:：])\\s*([^，。；;\\n]+)'),
      new RegExp(escaped + '\\s*[:：]\\s*([^，。；;\\n]+)')
    ];
    for (var index = 0; index < patterns.length; index += 1) {
      var match = patterns[index].exec(source);
      if (!match) continue;
      var value = normalize(match[1]).replace(/^(?:是|为)\s*/, '');
      if (value && value.length <= 120) updates.push({ key: key, label: label, value: value });
      break;
    }
  });
  return updates.filter(function (item, index, list) {
    return list.findIndex(function (candidate) { return candidate.key === item.key; }) === index;
  });
}

function classify(text, fields) {
  var value = normalize(text);
  var fieldUpdates = extractFieldUpdates(value, fields);
  if (!value) return { role: 'empty', fieldUpdates: [] };
  if (fieldUpdates.length) return { role: 'field_update', fieldUpdates: fieldUpdates };
  if (/(第[一二三四五六七八九十\d]+张|图片\s*\d+|报告|化验单).{0,40}(改成|改为|更正|替换|删除|删掉|不是.{0,12}是)/.test(value)
    || /(把|将).{0,30}(改成|改为|换成|替换为|更正为|删除|删掉)/.test(value)) {
    return { role: 'correction', fieldUpdates: [] };
  }
  if (/(只保留|只显示|不要显示|不要放|别放|不放进|排除|忽略这段|写详细|写简洁|简洁一点|详细一点|按时间|按日期|改成.{0,12}(格式|风格)|删除.{0,12}(章节|一节|一栏))/.test(value)) {
    return { role: 'instruction', fieldUpdates: [] };
  }
  return { role: 'patient_fact', fieldUpdates: [] };
}

function fromDecision(decision, fields) {
  var intents = decision && Array.isArray(decision.intents) ? decision.intents : [];
  var fieldMap = {};
  (fields || []).forEach(function (field) { fieldMap[field.key] = field; });
  var fieldUpdates = intents.filter(function (intent) {
    return intent && intent.type === 'update_field' && intent.target && fieldMap[intent.target.fieldKey];
  }).map(function (intent) {
    var field = fieldMap[intent.target.fieldKey];
    return {
      key: field.key,
      label: field.label,
      value: normalize(intent.payload && (intent.payload.value || intent.payload.text))
    };
  }).filter(function (item) { return item.value; });
  var types = intents.map(function (intent) { return intent && intent.type; });
  var role = types.indexOf('correct_material') >= 0 ? 'correction'
    : (types.indexOf('add_instruction') >= 0 ? 'instruction'
      : (fieldUpdates.length ? 'field_update' : 'patient_fact'));
  return {
    role: role,
    fieldUpdates: fieldUpdates,
    generateAfterAdd: types.indexOf('generate') >= 0,
    generalChat: types.indexOf('general_chat') >= 0,
    unclear: types.indexOf('unclear') >= 0
    ,materialActions: intents.filter(function (intent) {
      return intent && ['exclude_material', 'restore_material'].indexOf(intent.type) >= 0 && intent.target && intent.target.materialId;
    }).map(function (intent) {
      return { materialId: intent.target.materialId, status: intent.type === 'exclude_material' ? 'excluded' : 'included' };
    })
    ,includeRawText: types.some(function (type) { return ['add_fact', 'add_instruction', 'correct_material'].indexOf(type) >= 0; })
  };
}

module.exports = { classify: classify, extractFieldUpdates: extractFieldUpdates, fromDecision: fromDecision };
