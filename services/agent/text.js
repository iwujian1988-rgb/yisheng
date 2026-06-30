const request = require('../api/client').request;
const ENDPOINTS = require('../api/endpoints').ENDPOINTS;
const deviceSession = require('../device/session');

const TASK_LABELS = {
  organize: '整理文字',
  polish: '润色优化',
  extract: '提取要点',
  review: '内容检查',
  convert: '格式转换'
};

function listTasks() {
  return request({
    url: ENDPOINTS.agent.textTasks,
    method: 'GET'
  }).then(function (data) {
    return data.tasks || [];
  }).catch(function () {
    return Object.keys(TASK_LABELS).map(function (key) {
      return { key: key, label: TASK_LABELS[key] };
    });
  });
}

function runTextAgent(options) {
  var payload = {
    text: options.text || '',
    task: options.task || 'organize',
    messages: options.messages || []
  };
  if (options.templateId) {
    payload.templateId = options.templateId;
  }
  if (options.templateType) {
    payload.templateType = options.templateType;
  }
  if (options.mode) {
    payload.mode = options.mode;
  }

  return request({
    url: ENDPOINTS.agent.text,
    method: 'POST',
    data: payload
  });
}

function listTemplates() {
  return request({
    url: ENDPOINTS.templates.list,
    method: 'GET'
  }).then(function (data) {
    return data.templates || [];
  });
}

function getTemplate(id) {
  return request({
    url: ENDPOINTS.templates.detail.replace('{id}', encodeURIComponent(id)),
    method: 'GET'
  });
}

module.exports = {
  TASK_LABELS,
  listTasks,
  runTextAgent,
  listTemplates,
  getTemplate
};
