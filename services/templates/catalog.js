const { request, getBaseUrl } = require('../api/client');
const { ENDPOINTS, fillPath } = require('../api/endpoints');

function listTemplates(connected) {
  if (!getBaseUrl()) {
    return Promise.resolve({ templates: [], categories: [] });
  }
  var url = ENDPOINTS.ai.templates;
  return request({
    url: url,
    method: 'GET'
  }).then((data) => {
    if (data && Array.isArray(data.templates)) {
      return data;
    }
    if (Array.isArray(data)) {
      var cats = [];
      data.forEach(function (template) {
        if (template.category && cats.indexOf(template.category) === -1) {
          cats.push(template.category);
        }
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
  (fields || []).forEach(function (field) {
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

  var url = fillPath(ENDPOINTS.ai.templateGenerate, {
    id: currentTemplate.id || currentTemplate.templateCode
  });

  return request({
    url: url,
    method: 'POST',
    data: {
      values: valuesFromFields(fields)
    }
  });
}

module.exports = {
  generateTemplate,
  listTemplates,
  listLocalTemplates
};
