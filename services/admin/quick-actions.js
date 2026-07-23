const { request } = require('../api/client');
const { ENDPOINTS, fillPath } = require('../api/endpoints');

function listQuickActions(keyword) {
  return request({
    url: ENDPOINTS.admin.quickActions,
    method: 'GET'
  }).then((result) => {
    const list = Array.isArray(result) ? result : (result.list || []);
    const query = (keyword || '').trim();
    if (!query) return list;
    return list.filter((item) => {
      return (item.title || '').indexOf(query) !== -1
        || (item.actionCode || '').indexOf(query) !== -1
        || (item.category || '').indexOf(query) !== -1;
    });
  });
}

function createQuickAction(payload) {
  return request({
    url: ENDPOINTS.admin.quickActions,
    method: 'POST',
    data: payload || {}
  });
}

function updateQuickAction(id, patch) {
  return request({
    url: fillPath(ENDPOINTS.admin.quickActionDetail, { id }),
    method: 'PATCH',
    data: patch || {}
  });
}

module.exports = {
  listQuickActions,
  createQuickAction,
  updateQuickAction
};
