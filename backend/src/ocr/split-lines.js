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
  var structureStartedAt = Date.now();
  var normalized = normalizeText(text);
  var payload = extra && typeof extra === 'object' ? Object.assign({}, extra) : {};
  var structure = require('./structure-document');
  payload.document = structure.buildStructuredDocument({
    text: normalized,
    sourceId: payload.sourceId || 'source_unknown',
    pageIndex: payload.pageIndex || 0,
    reportDate: payload.reportDate || '',
    regions: payload.regions || [],
    rows: payload.rows || []
    ,metadata: payload.documentMetadata || {}
    ,dates: payload.documentDates || {}
  });
  if (/<table[\s>]/i.test(normalized)) {
    var outsideTables = normalizeText(normalized.replace(/<table[\s\S]*?<\/table>/gi, ' '));
    var tableText = structure.htmlTableRows(normalized).map(function (cells) {
      return cells.join(' | ');
    }).join('\n');
    normalized = [outsideTables, tableText].filter(Boolean).join('\n\n');
  }
  payload.text = normalized;
  payload.charCount = normalized.length;
  payload.lines = splitLinesFromText(normalized);
  payload.structureMs = Date.now() - structureStartedAt;
  return payload;
}

module.exports = {
  buildOcrPayload,
  normalizeText,
  splitLinesFromText
};
