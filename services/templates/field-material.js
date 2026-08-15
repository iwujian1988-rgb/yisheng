function normalizeValue(value) {
  return String(value === undefined || value === null ? '' : value).trim();
}

function buildFieldMaterial(fields) {
  return (fields || []).map(function (item) {
    var label = normalizeValue(item && item.label);
    var value = normalizeValue(item && item.value);
    return label && value ? (label + '：' + value) : '';
  }).filter(Boolean).join('\n');
}

function combineMaterials(freeText, fields) {
  return [normalizeValue(freeText), buildFieldMaterial(fields)].filter(Boolean).join('\n\n');
}

function countFilledFields(fields) {
  return (fields || []).filter(function (item) {
    return normalizeValue(item && item.value);
  }).length;
}

module.exports = {
  buildFieldMaterial: buildFieldMaterial,
  combineMaterials: combineMaterials,
  countFilledFields: countFilledFields
};
