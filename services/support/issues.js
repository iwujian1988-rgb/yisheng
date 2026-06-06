const { request } = require('../api/client');
const { ENDPOINTS } = require('../api/endpoints');

function normalizeIssue(payload) {
  const item = payload || {};
  return {
    type: String(item.type || ''),
    description: String(item.description || ''),
    serialNo: String(item.serialNo || '')
  };
}

function submitDeviceIssue(payload) {
  const issue = normalizeIssue(payload);

  if (!issue.type || !issue.description.trim()) {
    return Promise.reject({
      code: 'DEVICE_ISSUE_REQUIRED',
      message: '请选择问题类型并填写问题描述'
    });
  }

  return request({
    url: ENDPOINTS.support.issues,
    method: 'POST',
    data: issue
  });
}

module.exports = {
  submitDeviceIssue
};
