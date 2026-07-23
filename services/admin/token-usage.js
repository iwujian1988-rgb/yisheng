const { request } = require('../api/client');
const { ENDPOINTS } = require('../api/endpoints');

function listTokenUsage() {
  return request({
    url: ENDPOINTS.admin.tokenUsage,
    method: 'GET'
  }).then((result) => {
    if (Array.isArray(result)) return result;
    return (result && result.list) || [];
  });
}

function getDashboard() {
  return request({
    url: ENDPOINTS.admin.dashboard,
    method: 'GET'
  });
}

module.exports = {
  listTokenUsage,
  getDashboard
};
