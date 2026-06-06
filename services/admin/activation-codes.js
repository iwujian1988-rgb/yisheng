const { request } = require('../api/client');
const { ENDPOINTS } = require('../api/endpoints');

function parseCodes(rawText) {
  return (rawText || '')
    .split(/\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function getActivationCodes() {
  return request({
    url: ENDPOINTS.admin.activationCodes,
    method: 'GET'
  });
}

function importActivationCodes(rawText, memberDays) {
  const codes = parseCodes(rawText);
  if (!codes.length) {
    return Promise.reject({
      code: 'EMPTY_CODES',
      message: '请输入激活码'
    });
  }

  return request({
    url: ENDPOINTS.admin.activationCodesImport,
    method: 'POST',
    data: {
      codesText: codes.join('\n'),
      memberDays: Number(memberDays || 365)
    }
  }).then((result) => ({
    createdCount: Number(result.importedCount || result.createdCount || 0),
    items: result.items || []
  }));
}

function filterActivationCodes(filter) {
  return getActivationCodes().then((result) => {
    const list = Array.isArray(result) ? result : (result.list || []);
    if (!filter || filter === 'all') return list;
    return list.filter((item) => item.status === filter);
  });
}

module.exports = {
  getActivationCodes,
  importActivationCodes,
  filterActivationCodes
};
