const { request } = require('../api/client');
const { ENDPOINTS, fillPath } = require('../api/endpoints');

function validatePayload(payload) {
  const item = payload || {};
  if (item.phone && !/^1[3-9]\d{9}$/.test(item.phone)) {
    return {
      code: 'INVALID_PHONE',
      message: '请输入正确手机号'
    };
  }

  if (!item.expiryDate) {
    return {
      code: 'EXPIRY_REQUIRED',
      message: '请选择服务期限'
    };
  }

  return null;
}

function getPaidUsers() {
  return request({
    url: ENDPOINTS.admin.paidUsers,
    method: 'GET'
  }).then((result) => result.list || []);
}

function createPaidUser(payload) {
  const validationError = validatePayload(payload || {});
  if (validationError) {
    return Promise.reject(validationError);
  }

  return request({
    url: ENDPOINTS.admin.paidUsers,
    method: 'POST',
    data: payload || {}
  });
}

function getPaidUserById(id) {
  return request({
    url: fillPath(ENDPOINTS.admin.paidUserDetail, { id }),
    method: 'GET'
  });
}

function updatePaidUser(id, patch) {
  return request({
    url: fillPath(ENDPOINTS.admin.paidUserDetail, { id }),
    method: 'PATCH',
    data: patch || {}
  });
}

function searchPaidUsers(keyword) {
  const query = (keyword || '').trim();
  return getPaidUsers().then((users) => {
    if (!query) return users;
    return users.filter((user) => {
      return (user.phone || '').indexOf(query) !== -1
        || (user.boundDevice || '').indexOf(query) !== -1
        || (user.openidMasked || '').indexOf(query) !== -1;
    });
  });
}

function getPaidUserStats() {
  return getPaidUsers().then((users) => ({
    total: users.length,
    active: users.filter((user) => user.memberStatus === 'active').length,
    expired: users.filter((user) => user.memberStatus === 'expired').length,
    pending: users.filter((user) => user.memberStatus === 'pending').length,
    disabled: users.filter((user) => user.memberStatus === 'disabled').length
  }));
}

module.exports = {
  getPaidUsers,
  createPaidUser,
  getPaidUserById,
  updatePaidUser,
  searchPaidUsers,
  getPaidUserStats
};
