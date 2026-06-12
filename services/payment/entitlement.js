const { request, getBaseUrl } = require('../api/client');
const { ENDPOINTS } = require('../api/endpoints');
const authSession = require('../auth/session');
const activation = require('../purchase/activation');

function getEntitlement() {
  if (!getBaseUrl()) {
    var session = authSession.getStoredSessionSummary();
    return Promise.resolve({
      memberStatus: session.purchaseStatus === 'paid' ? 'active' : (session.memberStatus || 'none'),
      memberEnd: session.memberEnd || ''
    });
  }

  return request({
    url: ENDPOINTS.purchase.entitlement,
    method: 'GET'
  });
}

function checkActivationCode(code) {
  if (!getBaseUrl()) {
    return activation.checkActivationCode(code);
  }

  return request({
    url: ENDPOINTS.purchase.activate,
    method: 'POST',
    data: { activationCode: code }
  });
}

module.exports = {
  getEntitlement,
  checkActivationCode
};
