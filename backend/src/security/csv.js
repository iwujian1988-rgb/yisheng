function escapeCsvCell(value) {
  var text = String(value === undefined || value === null ? '' : value);
  if (/^[=+\-@]/.test(text)) {
    text = "'" + text;
  }
  if (/[",\r\n]/.test(text)) {
    return '"' + text.replace(/"/g, '""') + '"';
  }
  return text;
}

function toCsv(columns, rows) {
  var header = columns.map((column) => escapeCsvCell(column.label)).join(',');
  var body = rows.map((row) => {
    return columns.map((column) => escapeCsvCell(row[column.key])).join(',');
  });
  return [header].concat(body).join('\n');
}

function parseCsvLine(line) {
  var cells = [];
  var cell = '';
  var inQuotes = false;
  for (var i = 0; i < line.length; i += 1) {
    var ch = line[i];
    var next = line[i + 1];
    if (ch === '"' && inQuotes && next === '"') {
      cell += '"';
      i += 1;
    } else if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += ch;
    }
  }
  cells.push(cell.trim());
  return cells;
}

function parseCsvText(text) {
  var lines = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  var headers = parseCsvLine(lines[0]).map((item) => item.trim());
  return lines.slice(1).map((line, index) => {
    var cells = parseCsvLine(line);
    var row = { rowNumber: index + 2 };
    headers.forEach((header, cellIndex) => {
      row[header] = cells[cellIndex] || '';
    });
    return row;
  });
}

module.exports = {
  parseCsvText,
  toCsv
};
