const { request } = require('../api/client');
const { ENDPOINTS } = require('../api/endpoints');
const devAuth = require('./dev-auth');
const {
  resolveAccountStatus,
  canUseCoreFeatures
} = require('../constants/account-status');

function normalizeSessionPayload(payload) {
  const data = payload && payload.data ? payload.data : payload;
  const profile = {
    user: data.user || data.userInfo || null,
    token: data.token || '',
    purchaseStatus: data.purchaseStatus || 'none',
    deviceBindingStatus: data.deviceBindingStatus || 'not_bound',
    serviceStatus: data.serviceStatus || 'active',
    templateAccess: data.templateAccess || (data.device && data.device.templateAccess) || 'general',
    device: data.device || null
  };

  profile.accountStatus = resolveAccountStatus(profile);
  profile.canUseCoreFeatures = canUseCoreFeatures(profile);
  return profile;
}

function persistSession(profile) {
  if (profile.token) {
    wx.setStorageSync('token', profile.token);
  }
  if (profile.user) {
    wx.setStorageSync('userInfo', profile.user);
  }
  wx.setStorageSync('accountStatus', profile.accountStatus);
  wx.setStorageSync('purchaseStatus', profile.purchaseStatus);
  wx.setStorageSync('deviceBindingStatus', profile.deviceBindingStatus);
  wx.setStorageSync('serviceStatus', profile.serviceStatus);
  wx.setStorageSync('templateAccess', profile.templateAccess || 'general');
  if (profile.device) {
    wx.setStorageSync('boundDevice', profile.device);
  }
}

function clearSession() {
  wx.removeStorageSync('token');
  wx.removeStorageSync('userInfo');
  wx.removeStorageSync('accountStatus');
  wx.removeStorageSync('purchaseStatus');
  wx.removeStorageSync('deviceBindingStatus');
  wx.removeStorageSync('serviceStatus');
  wx.removeStorageSync('templateAccess');
  wx.removeStorageSync('boundDevice');
}

function loginWithPassword(account, password) {
  if (!getApiBaseUrl()) {
    return devAuth.loginWithPassword(account, password).then((payload) => {
      const profile = normalizeSessionPayload(payload);
      persistSession(profile);
      return profile;
    });
  }

  return request({
    url: ENDPOINTS.auth.login,
    method: 'POST',
    data: { account, password }
  }).then((payload) => {
    const profile = normalizeSessionPayload(payload);
    persistSession(profile);
    return profile;
  });
}

function loginWithWechat(code, userInfo) {
  const loginRequest = !getApiBaseUrl()
    ? devAuth.loginWithWechat(code, userInfo)
    : request({
      url: ENDPOINTS.auth.wechatLogin,
      method: 'POST',
      data: { code, userInfo }
    });

  return loginRequest.then((payload) => {
    const profile = normalizeSessionPayload(payload);
    persistSession(profile);
    return profile;
  });
}

function getStoredSessionSummary() {
  return {
    token: wx.getStorageSync('token') || '',
    user: wx.getStorageSync('userInfo') || null,
    accountStatus: wx.getStorageSync('accountStatus') || '',
    purchaseStatus: wx.getStorageSync('purchaseStatus') || '',
    deviceBindingStatus: wx.getStorageSync('deviceBindingStatus') || '',
    serviceStatus: wx.getStorageSync('serviceStatus') || '',
    templateAccess: wx.getStorageSync('templateAccess') || 'general',
    device: wx.getStorageSync('boundDevice') || null
  };
}

function getApiBaseUrl() {
  const app = typeof getApp === 'function' ? getApp() : null;
  return (app && app.globalData && app.globalData.baseUrl) || '';
}

function requestRegisterCode(phone) {
  if (!getApiBaseUrl()) {
    return devAuth.requestRegisterCode(phone);
  }

  return request({
    url: ENDPOINTS.auth.registerCode,
    method: 'POST',
    data: { phone }
  });
}

function registerWithPhone(phone, code, password) {
  const registerRequest = !getApiBaseUrl()
    ? devAuth.registerWithPhone(phone, code, password)
    : request({
      url: ENDPOINTS.auth.register,
      method: 'POST',
      data: { phone, code, password }
    });

  return registerRequest.then((payload) => {
    const profile = normalizeSessionPayload(payload);
    persistSession(profile);
    return profile;
  });
}

function requestResetCode(phone) {
  if (!getApiBaseUrl()) {
    return devAuth.requestResetCode(phone);
  }

  return request({
    url: ENDPOINTS.auth.resetCode,
    method: 'POST',
    data: { phone }
  });
}

function resetPassword(phone, code, password) {
  if (!getApiBaseUrl()) {
    return devAuth.resetPassword(phone, code, password);
  }

  return request({
    url: ENDPOINTS.auth.resetPassword,
    method: 'POST',
    data: { phone, code, password }
  });
}

module.exports = {
  normalizeSessionPayload,
  persistSession,
  clearSession,
  loginWithPassword,
  loginWithWechat,
  getStoredSessionSummary,
  requestRegisterCode,
  registerWithPhone,
  requestResetCode,
  resetPassword
};
