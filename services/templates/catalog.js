const { request, getBaseUrl } = require('../api/client');
const { ENDPOINTS, fillPath } = require('../api/endpoints');
const { isBluetoothConnected } = require('../entitlements/features');

function listTemplates() {
  if (!getBaseUrl()) {
    return Promise.resolve({ templates: [], categories: [] });
  }
  return request({
    url: ENDPOINTS.ai.templates,
    method: 'GET',
    data: { deviceConnected: isBluetoothConnected() }
  }).then((data) => {
    if (data && Array.isArray(data.templates)) {
      return data;
    }
    if (Array.isArray(data)) {
      var cats = [];
      data.forEach(function (t) {
        if (t.category && cats.indexOf(t.category) === -1) cats.push(t.category);
      });
      return { templates: data, categories: cats };
    }
    return { templates: [], categories: [] };
  }).catch(function () {
    return { templates: [], categories: [] };
  });
}

function listLocalTemplates() {
  return Promise.resolve([]);
}

function valuesFromFields(fields) {
  var values = {};
  (fields || []).forEach((field) => {
    values[field.key] = String(field.value || '').trim();
  });
  return values;
}

function generateTemplate(template, fields) {
  var currentTemplate = template || {};
  if (!getBaseUrl()) {
    return Promise.reject({
      code: 'TEMPLATE_BACKEND_REQUIRED',
      message: '模板服务暂时不可用'
    });
  }

  return request({
    url: fillPath(ENDPOINTS.ai.templateGenerate, {
      id: currentTemplate.id || currentTemplate.templateCode
    }),
    method: 'POST',
    data: {
      values: valuesFromFields(fields),
      deviceConnected: isBluetoothConnected()
    }
  });
}

module.exports = {
  generateTemplate,
  listTemplates,
  listLocalTemplates
};
