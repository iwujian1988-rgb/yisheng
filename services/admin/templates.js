const { request } = require('../api/client');
const { ENDPOINTS, fillPath } = require('../api/endpoints');

function listTemplates(keyword) {
  return request({
    url: ENDPOINTS.admin.templates,
    method: 'GET'
  }).then((result) => {
    const list = Array.isArray(result) ? result : (result.list || []);
    const query = (keyword || '').trim();
    if (!query) return list;
    return list.filter((item) => {
      return (item.name || '').indexOf(query) !== -1
        || (item.templateCode || '').indexOf(query) !== -1
        || (item.category || '').indexOf(query) !== -1;
    });
  });
}

function getTemplateById(id) {
  return request({
    url: fillPath(ENDPOINTS.admin.templateDetail, { id }),
    method: 'GET'
  });
}

function createTemplate(payload) {
  return request({
    url: ENDPOINTS.admin.templates,
    method: 'POST',
    data: payload || {}
  });
}

function updateTemplate(id, patch) {
  return request({
    url: fillPath(ENDPOINTS.admin.templateDetail, { id }),
    method: 'PATCH',
    data: patch || {}
  });
}

module.exports = {
  listTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate
};
