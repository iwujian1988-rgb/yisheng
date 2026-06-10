const { getBaseUrl, request } = require('../api/client');
const { ENDPOINTS } = require('../api/endpoints');
const authSession = require('../auth/session');

const LOCAL_TEST_ACTIVATION_CODE = 'ACTIVE123456';

function activateLocalCode(code) {
  if (code !== LOCAL_TEST_ACTIVATION_CODE) {
    return Promise.reject({
      code: 'INVALID_ACTIVATION_CODE',
      message: '激活码无效或已被使用'
    });
  }

  wx.setStorageSync('purchaseStatus', 'paid');
  wx.setStorageSync('deviceBindingStatus', 'not_bound');
  wx.setStorageSync('serviceStatus', 'active');
  wx.setStorageSync('accountStatus', 'active');

  return Promise.resolve({
    memberStatus: 'active',
    purchaseStatus: 'paid',
    deviceBindingStatus: 'not_bound',
    accountStatus: 'active'
  });
}

function checkActivationCode(code) {
  if (!code) {
    return Promise.reject({
      code: 'ACTIVATION_CODE_REQUIRED',
      message: '请输入激活码'
    });
  }

  if (!getBaseUrl()) {
    return activateLocalCode(code);
  }

  return request({
    url: ENDPOINTS.purchase.activate,
    method: 'POST',
    data: { activationCode: code }
  }).then((result) => {
    return authSession.refreshCurrentSession()
      .then((profile) => Object.assign({}, result || {}, profile || {}))
      .catch(() => result);
  });
}

module.exports = {
  checkActivationCode
};
