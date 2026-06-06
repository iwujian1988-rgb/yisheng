const { request } = require('../api/client');
const { ENDPOINTS } = require('../api/endpoints');

function checkActivationCode(code) {
  if (!code) {
    return Promise.reject({
      code: 'ACTIVATION_CODE_REQUIRED',
      message: '请输入激活码'
    });
  }

  return request({
    url: ENDPOINTS.purchase.activate,
    method: 'POST',
    data: { activationCode: code }
  });
}

module.exports = {
  checkActivationCode
};
