const deviceSession = require('../device/session');
const apiBase = require('../config/api-base');

function getAppInstance() {
  return typeof getApp === 'function' ? getApp() : null;
}

function getBaseUrl() {
  const app = getAppInstance();
  if (app && app.globalData && app.globalData.resolvedBaseUrl) {
    return app.globalData.resolvedBaseUrl;
  }
  return apiBase.resolveApiBaseUrl();
}

function normalizeResponse(data) {
  if (data && Object.prototype.hasOwnProperty.call(data, 'data')) {
    return data.data;
  }
  return data;
}

function getToken() {
  return wx.getStorageSync('token') || '';
}

function clearAuthStorage() {
  wx.removeStorageSync('token');
  wx.removeStorageSync('userInfo');
  wx.removeStorageSync('accountStatus');
  wx.removeStorageSync('purchaseStatus');
  wx.removeStorageSync('deviceBindingStatus');
  wx.removeStorageSync('serviceStatus');
  wx.removeStorageSync('boundDevice');
  deviceSession.clearDeviceSession();
}

function getDeviceSessionHeader() {
  const token = deviceSession.getDeviceSessionToken();
  return token ? { 'X-Device-Session': token } : {};
}

function handleUnauthorized() {
  clearAuthStorage();
  wx.reLaunch({ url: '/pages/login/login' });
}

function friendlyMessage(code, fallback) {
  const map = {
    API_BASE_URL_NOT_CONFIGURED: '后端服务地址尚未配置，请先在 app.js 设置 globalData.baseUrl',
    NETWORK_ERROR: '网络请求失败，请检查后端地址和网络连接',
    UPLOAD_NETWORK_ERROR: '上传请求失败，请检查网络连接',
    REQUEST_BODY_TOO_LARGE: '上传内容过大，请压缩后重试',
    AUTH_REQUIRED: '登录已过期，请重新登录（后端重启后需重新登录）',
    ADMIN_AUTH_REQUIRED: '请先登录管理后台',
    INVALID_ACTIVATION_CODE: '激活码无效或已被使用',
    ACTIVATION_CODE_REQUIRED: '请输入激活码',
    ENTITLEMENT_REQUIRED: '请先完成服务开通',
    MEMBER_REQUIRED: '当前账号暂未开通会员能力',
    DEVICE_CONNECTION_REQUIRED: '请先连接设备后再使用',
    DEVICE_NOT_BOUND: '设备绑定信息不一致，请重新连接蓝牙设备',
    DEVICE_SESSION_REQUIRED: '设备会话已失效，请重新连接蓝牙设备',
    DEVICE_SESSION_EXPIRED: '设备会话已过期，请重新连接蓝牙设备',
    DEVICE_NOT_REGISTERED: '设备未登记，请联系管理员预置设备',
    DEVICE_RESERVED_FOR_OTHER_USER: '设备已预留给其他用户',
    DEVICE_ALREADY_BOUND: '设备已被其他账号绑定',
    DEVICE_PROOF_INVALID: '设备校验码错误',
    DEVICE_PROOF_REQUIRED: '请输入设备校验码',
    SERIAL_REQUIRED: '请输入设备序列号',
    ASR_AUDIO_REQUIRED: '请先完成录音',
    ASR_AUDIO_INVALID: '录音内容无效，请重新录制',
    ASR_AUDIO_TOO_LARGE: '录音文件过大，请缩短录音时长',
    ASR_WORKER_FAILED: '语音转写暂时不可用，请稍后重试',
    OCR_WORKER_FAILED: '图片识别暂时不可用，请稍后重试'
  };
  return map[code] || fallback || '请求失败';
}

function notConfiguredError() {
  return Promise.reject({
    code: 'API_BASE_URL_NOT_CONFIGURED',
    message: friendlyMessage('API_BASE_URL_NOT_CONFIGURED')
  });
}

const DEVICE_SETUP_PATHS = [
  '/api/devices/auto-bind',
  '/api/devices/bind',
  '/api/devices/session/start',
  '/api/devices/session/verify',
  '/api/devices/unbind'
];

function shouldRefreshDeviceSession(url, token) {
  return Boolean(
    token &&
    url !== '/api/auth/wechat-login' &&
    url !== '/api/auth/login' &&
    DEVICE_SETUP_PATHS.indexOf(url) === -1
  );
}

function request(options) {
  const config = options || {};
  const url = config.url;
  const method = config.method || 'GET';
  const data = config.data || {};
  const header = config.header || {};
  const token = getToken();
  const baseUrl = getBaseUrl();

  if (!baseUrl) {
    return notConfiguredError();
  }

  const shouldRefresh = shouldRefreshDeviceSession(url, token);
  const beforeRequest = shouldRefresh
    ? deviceSession.refreshIfNeeded().catch(() => null)
    : Promise.resolve(null);

  return beforeRequest.then(() => new Promise((resolve, reject) => {
    wx.request({
      url: baseUrl + url,
      method,
      data,
      header: Object.assign({
        'Content-Type': 'application/json',
        Authorization: token ? 'Bearer ' + token : ''
      }, getDeviceSessionHeader(), header),
      success(res) {
        const body = res.data || {};
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(normalizeResponse(body));
          return;
        }

        if (res.statusCode === 401) {
          handleUnauthorized();
        }

        reject({
          code: body.code || 'HTTP_ERROR',
          statusCode: res.statusCode,
          message: friendlyMessage(body.code, body.message || '请求失败'),
          raw: res
        });
      },
      fail(err) {
        console.error('[api] request failed:', baseUrl + url, err);
        reject({
          code: 'NETWORK_ERROR',
          message: apiBase.getNetworkHint(baseUrl),
          raw: err
        });
      }
    });
  }));
}

function uploadFile(options) {
  const config = options || {};
  const url = config.url;
  const filePath = config.filePath;
  const name = config.name || 'file';
  const formData = config.formData || {};
  const token = getToken();
  const baseUrl = getBaseUrl();

  if (!baseUrl) {
    return notConfiguredError();
  }

  if (!filePath) {
    return Promise.reject({
      code: 'UPLOAD_FILE_REQUIRED',
      message: '请选择要上传的文件'
    });
  }

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: baseUrl + url,
      filePath,
      name,
      formData,
      header: Object.assign({
        Authorization: token ? 'Bearer ' + token : ''
      }, getDeviceSessionHeader()),
      success(res) {
        let body = {};
        try {
          body = res.data ? JSON.parse(res.data) : {};
        } catch (error) {
          reject({
            code: 'UPLOAD_RESPONSE_PARSE_ERROR',
            message: '上传响应解析失败',
            raw: res
          });
          return;
        }

        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(normalizeResponse(body));
          return;
        }

        reject({
          code: body.code || 'UPLOAD_HTTP_ERROR',
          statusCode: res.statusCode,
          message: friendlyMessage(body.code, body.message || '上传失败'),
          raw: res
        });
      },
      fail(err) {
        reject({
          code: 'UPLOAD_NETWORK_ERROR',
          message: friendlyMessage('UPLOAD_NETWORK_ERROR'),
          raw: err
        });
      }
    });
  });
}

module.exports = {
  friendlyMessage,
  getBaseUrl,
  request,
  uploadFile
};
