const { request, getBaseUrl } = require('../api/client');
const { ENDPOINTS } = require('../api/endpoints');
const devAuth = require('./dev-auth');
const {
  resolveAccountStatus,
  canUseCoreFeatures
} = require('../constants/account-status');
const deviceSession = require('../device/session');

let refreshCurrentSessionPromise = null;

function normalizeSessionPayload(payload) {
  const data = payload && payload.data ? payload.data : payload;
  const profile = {
    user: data.user || data.userInfo || null,
    token: data.token || '',
    purchaseStatus: data.purchaseStatus || 'none',
    deviceBindingStatus: data.deviceBindingStatus || 'not_bound',
    serviceStatus: data.serviceStatus || 'active',
    device: data.device || null,
    features: data.features || {}
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
  wx.setStorageSync('features', profile.features || {});
  if (profile.device) {
    wx.setStorageSync('boundDevice', profile.device);
  }
  if (profile.token && profile.purchaseStatus === 'paid' && profile.deviceBindingStatus === 'bound') {
    deviceSession.ensureActiveSession().catch(() => null);
  }
}

function clearSession() {
  wx.removeStorageSync('token');
  wx.removeStorageSync('userInfo');
  wx.removeStorageSync('accountStatus');
  wx.removeStorageSync('purchaseStatus');
  wx.removeStorageSync('deviceBindingStatus');
  wx.removeStorageSync('serviceStatus');
  wx.removeStorageSync('features');
  wx.removeStorageSync('boundDevice');
  deviceSession.clearDeviceSession();
}

function loginWithPassword(account, password) {
  if (!getBaseUrl()) {
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

function loginWithPhoneCode(phone, code, wechatCode, userInfo) {
  const loginRequest = !getBaseUrl()
    ? devAuth.loginWithPhoneCode(phone, code, wechatCode, userInfo)
    : request({
      url: ENDPOINTS.auth.login,
      method: 'POST',
      data: { phone, code, wechatCode, userInfo }
    });

  return loginRequest.then((payload) => {
    const profile = normalizeSessionPayload(payload);
    persistSession(profile);
    return profile;
  });
}

function loginWithWechat(code, userInfo) {
  const loginRequest = !getBaseUrl()
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
    device: wx.getStorageSync('boundDevice') || null,
    features: wx.getStorageSync('features') || {}
  };
}

function fetchWechatLoginCode(timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(code || '');
    };
    const timer = setTimeout(() => finish(''), timeoutMs || 6000);
    wx.login({
      success: (res) => finish((res && res.code) || ''),
      fail: () => finish('')
    });
  });
}

function redirectExpiredSessionToLogin() {
  clearSession();
  try {
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
    const current = pages && pages.length ? pages[pages.length - 1] : null;
    if (current && current.route) wx.setStorageSync('postLoginReturnUrl', '/' + current.route);
  } catch (e) {}
  wx.reLaunch({ url: '/pages/login/login' });
}

function refreshCurrentSession() {
  if (!getBaseUrl()) {
    return Promise.resolve(getStoredSessionSummary());
  }
  if (refreshCurrentSessionPromise) return refreshCurrentSessionPromise;

  refreshCurrentSessionPromise = request({
    url: ENDPOINTS.auth.me,
    method: 'GET',
    suppressAuthRedirect: true
  }).then((payload) => {
    const current = getStoredSessionSummary();
    const profile = normalizeSessionPayload(Object.assign({}, payload || {}, {
      token: current.token || (payload && payload.token) || ''
    }));
    persistSession(profile);
    return profile;
  }).catch((error) => {
    if (!error || error.code !== 'AUTH_REQUIRED' || !getStoredSessionSummary().token) throw error;
    return fetchWechatLoginCode(6000).then((code) => {
      if (!code) throw { code: 'WECHAT_LOGIN_TIMEOUT', message: '微信登录超时' };
      return loginWithWechat(code, null);
    });
  }).catch((error) => {
    if (error && (error.code === 'AUTH_REQUIRED' || error.code === 'WECHAT_LOGIN_TIMEOUT')) {
      redirectExpiredSessionToLogin();
    }
    throw error;
  }).finally(() => {
    refreshCurrentSessionPromise = null;
  });
  return refreshCurrentSessionPromise;
}

function requestRegisterCode(phone) {
  if (!getBaseUrl()) {
    return devAuth.requestRegisterCode(phone);
  }

  return request({
    url: ENDPOINTS.auth.registerCode,
    method: 'POST',
    data: { phone }
  });
}

function registerWithPhone(phone, code, password) {
  const registerRequest = !getBaseUrl()
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

module.exports = {
  normalizeSessionPayload,
  persistSession,
  clearSession,
  loginWithPassword,
  loginWithPhoneCode,
  loginWithWechat,
  refreshCurrentSession,
  getStoredSessionSummary,
  requestRegisterCode,
  registerWithPhone
};
