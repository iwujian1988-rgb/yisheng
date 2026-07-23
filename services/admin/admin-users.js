const { request } = require('../api/client');
const { ENDPOINTS, fillPath } = require('../api/endpoints');

function listAdminUsers(keyword) {
  return request({
    url: ENDPOINTS.admin.adminUsers,
    method: 'GET'
  }).then((result) => {
    const list = Array.isArray(result) ? result : (result.list || []);
    const query = (keyword || '').trim();
    if (!query) return list;
    return list.filter((item) => {
      return (item.account || '').indexOf(query) !== -1
        || (item.role || '').indexOf(query) !== -1;
    });
  });
}

function createAdminUser(payload) {
  return request({
    url: ENDPOINTS.admin.adminUsers,
    method: 'POST',
    data: payload || {}
  });
}

function updateAdminUser(id, patch) {
  return request({
    url: fillPath(ENDPOINTS.admin.adminUserDetail, { id }),
    method: 'PATCH',
    data: patch || {}
  });
}

module.exports = {
  listAdminUsers,
  createAdminUser,
  updateAdminUser
};
