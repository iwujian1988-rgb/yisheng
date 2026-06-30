const { request, getBaseUrl } = require('../api/client');
const { ENDPOINTS, fillPath } = require('../api/endpoints');

function listTemplates() {
  if (!getBaseUrl()) {
    return Promise.resolve({ templates: [] });
  }
  return request({
    url: ENDPOINTS.templates.list,
    method: 'GET'
  }).then(function (data) {
    return {
      templates: (data && data.templates) || []
    };
  }).catch(function () {
    return { templates: [] };
  });
}

function getTemplate(id) {
  return request({
    url: fillPath(ENDPOINTS.templates.detail, { id: id }),
    method: 'GET'
  });
}

function saveTemplate(draft) {
  return request({
    url: ENDPOINTS.templates.save,
    method: 'POST',
    data: { templateDraft: draft }
  });
}

function runTemplateAgent(options) {
  return request({
    url: ENDPOINTS.agent.template,
    method: 'POST',
    data: {
      templateType: options.templateType,
      templateName: options.templateName || '',
      content: options.content || '',
      options: options.options || {}
    }
  });
}

module.exports = {
  listTemplates,
  getTemplate,
  saveTemplate,
  runTemplateAgent
};
