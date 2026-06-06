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

module.exports = {
  toCsv
};
