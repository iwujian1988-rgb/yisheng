const { ENDPOINTS } = require('../api/endpoints');

const SESSION_KEY = 'deviceSession';
const REFRESH_BEFORE_MS = 2 * 60 * 1000;

let refreshPromise = null;

function getAppInstance() {
  return typeof getApp === 'function' ? getApp() : null;
}

function getBaseUrl() {
  const app = getAppInstance();
  return (app && app.globalData && app.globalData.baseUrl) || '';
}

function getAuthToken() {
  return wx.getStorageSync('token') || '';
}

function persistDeviceSession(payload) {
  const session = {
    token: payload.deviceSessionToken || payload.token || '',
    expiresAt: payload.expiresAt || '',
    capabilities: payload.capabilities || [],
    device: payload.device || null,
    updatedAt: Date.now()
  };
  if (!session.token) return null;
  wx.setStorageSync(SESSION_KEY, session);
  const app = getAppInstance();
  if (app && app.globalData) {
    app.globalData.deviceSessionToken = session.token;
    app.globalData.deviceSessionExpiresAt = session.expiresAt;
    if (session.device && session.device.id) {
      app.globalData.deviceId = session.device.id;
      app.globalData.deviceConnected = true;
    }
  }
  return session;
}

function persistBoundDevice(device) {
  if (!device || !device.id) return null;
  wx.setStorageSync('boundDevice', device);
  wx.setStorageSync('deviceBindingStatus', 'bound');
  const app = getAppInstance();
  if (app && app.globalData) {
    app.globalData.deviceId = device.id;
    app.globalData.deviceConnected = true;
  }
  return device;
}

function getDeviceSession() {
  const session = wx.getStorageSync(SESSION_KEY);
  return session && typeof session === 'object' ? session : null;
}

function clearDeviceSession() {
  wx.removeStorageSync(SESSION_KEY);
  const app = getAppInstance();
  if (app && app.globalData) {
    app.globalData.deviceSessionToken = '';
    app.globalData.deviceSessionExpiresAt = '';
  }
}

function isExpired(session, offsetMs) {
  if (!session || !session.token || !session.expiresAt) return true;
  return new Date(session.expiresAt).getTime() <= Date.now() + (offsetMs || 0);
}

function getDeviceSessionToken() {
  const session = getDeviceSession();
  if (isExpired(session, 0)) {
    clearDeviceSession();
    return '';
  }
  return session.token;
}

function rawRequest(path, method, data, extraHeader) {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    return Promise.reject({ code: 'API_BASE_URL_NOT_CONFIGURED', message: '后端服务地址未配置' });
  }
  return new Promise((resolve, reject) => {
    wx.request({
      url: baseUrl + path,
      method: method || 'POST',
      data: data || {},
      header: Object.assign({
        'Content-Type': 'application/json',
        Authorization: getAuthToken() ? 'Bearer ' + getAuthToken() : ''
      }, extraHeader || {}),
      success(res) {
        const body = res.data || {};
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body.data === undefined ? body : body.data);
          return;
        }
        reject({
          code: body.code || 'HTTP_ERROR',
          statusCode: res.statusCode,
          message: body.message || '请求失败',
          raw: res
        });
      },
      fail(err) {
        reject({ code: 'NETWORK_ERROR', message: '网络请求失败', raw: err });
      }
    });
  });
}

function openDeviceSession(options) {
  const payload = options || {};
  const device = payload.device || {};
  const startBody = {
    deviceId: device.id || payload.deviceId || '',
    serialNo: device.serialNo || payload.serialNo || '',
    bleDeviceId: payload.bleDeviceId || device.bleDeviceId || device.mac || ''
  };
  return rawRequest(ENDPOINTS.devices.sessionStart, 'POST', startBody)
    .then((challenge) => {
      return rawRequest(ENDPOINTS.devices.sessionVerify, 'POST', {
        challengeId: challenge.challengeId,
        serialNo: startBody.serialNo,
        deviceId: startBody.deviceId,
        response: payload.proofCode || device.proofCode || ''
      });
    })
    .then((result) => persistDeviceSession(result));
}

function refreshDeviceSession() {
  const session = getDeviceSession();
  if (!session || !session.token) return Promise.resolve(null);
  return rawRequest(ENDPOINTS.devices.sessionRefresh, 'POST', {}, {
    'X-Device-Session': session.token
  }).then((result) => persistDeviceSession(result));
}

function tryOpenDevBypassSession() {
  const app = getAppInstance();
  const gd = app && app.globalData ? app.globalData : {};
  const bypass = Boolean(gd.skipBluetoothForDev || wx.getStorageSync('skipBluetoothForDev'));
  if (!bypass) return Promise.resolve(null);
  const device = wx.getStorageSync('boundDevice');
  if (device && device.id) {
    return openDeviceSession({ device }).catch(() => {
      wx.removeStorageSync('boundDevice');
      wx.setStorageSync('deviceBindingStatus', 'not_bound');
      return tryOpenDevBypassSession();
    });
  }
  const user = wx.getStorageSync('userInfo') || {};
  const userKey = String(user.id || user.openid || 'local').replace(/[^a-zA-Z0-9_-]/g, '').slice(-12) || 'local';
  const serialNo = 'DEV-AUTO-' + userKey;
  return rawRequest(ENDPOINTS.devices.autoBind, 'POST', {
    bleDeviceName: serialNo,
    bleDeviceId: serialNo
  }).then((boundDevice) => {
    const nextDevice = boundDevice && boundDevice.device ? boundDevice.device : boundDevice;
    persistBoundDevice(nextDevice);
    return openDeviceSession({ device: nextDevice });
  }).catch(() => null);
}

function refreshIfNeeded() {
  const session = getDeviceSession();
  if (!session || !session.token) {
    return tryOpenDevBypassSession();
  }
  if (!isExpired(session, REFRESH_BEFORE_MS)) {
    return Promise.resolve(session);
  }
  if (!refreshPromise) {
    refreshPromise = refreshDeviceSession()
      .catch((error) => {
        clearDeviceSession();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

module.exports = {
  clearDeviceSession,
  getDeviceSession,
  getDeviceSessionToken,
  openDeviceSession,
  persistDeviceSession,
  refreshDeviceSession,
  refreshIfNeeded
};
