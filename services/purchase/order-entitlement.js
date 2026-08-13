const { request } = require('../api/client');
const { ENDPOINTS } = require('../api/endpoints');
const authSession = require('../auth/session');

function claimWithWechatPhone(phoneCode) {
  return request({
    url: ENDPOINTS.purchase.claimOrderEntitlement,
    method: 'POST',
    data: { phoneCode }
  }).then((result) => authSession.refreshCurrentSession().then(() => result));
}

module.exports = { claimWithWechatPhone };
