function maskPhone(phone) {
  var value = String(phone || '');
  if (value.length < 7) return value;
  return value.slice(0, 3) + '****' + value.slice(-4);
}

function pickPage(query) {
  var page = Math.max(Number(query.page || 1), 1);
  var pageSize = Math.min(Math.max(Number(query.pageSize || 20), 1), 100);
  return {
    page: page,
    pageSize: pageSize
  };
}

function paginate(items, query) {
  var pageInfo = pickPage(query || {});
  var start = (pageInfo.page - 1) * pageInfo.pageSize;
  return {
    list: items.slice(start, start + pageInfo.pageSize),
    page: pageInfo.page,
    pageSize: pageInfo.pageSize,
    total: items.length
  };
}

module.exports = {
  maskPhone,
  paginate
};
