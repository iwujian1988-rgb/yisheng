function normalizeText(value) {
  return String(value || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

function splitLinesFromText(text) {
  var normalized = normalizeText(text);
  if (!normalized) return [];

  var visualLines = normalized.split('\n')
    .map(function (line) { return line.trim(); })
    .filter(Boolean);

  var lines = visualLines.map(function (line, index) {
    return {
      index: index,
      text: line,
      field: null
    };
  });

  if (!lines.length) {
    lines.push({
      index: 0,
      text: normalized,
      field: null
    });
  }

  return lines;
}

function buildOcrPayload(text, extra) {
  var normalized = normalizeText(text);
  var payload = extra && typeof extra === 'object' ? Object.assign({}, extra) : {};
  payload.text = normalized;
  payload.charCount = normalized.length;
  payload.lines = splitLinesFromText(normalized);
  return payload;
}

module.exports = {
  buildOcrPayload,
  normalizeText,
  splitLinesFromText
};
