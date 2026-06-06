const { request } = require('../api/client');
const { ENDPOINTS } = require('../api/endpoints');

function normalizeFeedback(payload) {
  const item = payload || {};
  return {
    type: String(item.type || ''),
    content: String(item.content || ''),
    contact: String(item.contact || '')
  };
}

function submitFeedback(payload) {
  const item = normalizeFeedback(payload);

  if (!item.type || !item.content.trim()) {
    return Promise.reject({
      code: 'FEEDBACK_REQUIRED',
      message: '请选择类型并填写反馈内容'
    });
  }

  return request({
    url: ENDPOINTS.support.feedbacks,
    method: 'POST',
    data: item
  });
}

module.exports = {
  submitFeedback
};
