const { request, getBaseUrl } = require('../api/client');
const { ENDPOINTS } = require('../api/endpoints');
const authSession = require('../auth/session');
const deviceSession = require('./session');
const bleLink = require('./ble-link');

function normalizeDevicePayload(device) {
  return device && device.device ? device.device : device;
}

function persistBoundDevice(device, extra) {
  const nextDevice = Object.assign({}, device || {}, extra || {});
  if (!nextDevice.id) return null;
  wx.setStorageSync('boundDevice', nextDevice);
  wx.setStorageSync('deviceBindingStatus', 'bound');
  const app = typeof getApp === 'function' ? getApp() : null;
  if (app && app.globalData) {
    app.globalData.deviceId = nextDevice.id;
    app.globalData.deviceConnected = true;
  }
  return nextDevice;
}

function mapDeviceSessionError(error) {
  const code = error && error.code ? error.code : '';
  const map = {
    DEVICE_NOT_BOUND: '设备绑定信息不一致，请重新连接蓝牙设备',
    DEVICE_SESSION_PROOF_INVALID: '设备校验失败，请联系管理员确认设备信息',
    MEMBER_REQUIRED: '当前账号暂未开通会员能力',
    DEVICE_SESSION_REQUIRED: '设备会话已失效，请重新连接蓝牙设备',
    DEVICE_CHALLENGE_INVALID: '设备校验已过期，请重新连接蓝牙设备',
    DEVICE_CHALLENGE_EXPIRED: '设备校验已过期，请重新连接蓝牙设备'
  };
  return Object.assign({}, error || {}, {
    message: map[code] || (error && error.message) || '设备会话建立失败，请重新连接蓝牙设备'
  });
}

function bindAndOpenSession(nextDevice, bleDeviceId, proofCode) {
  const boundDevice = persistBoundDevice(nextDevice, {
    bleDeviceId: bleDeviceId || nextDevice.bleDeviceId || '',
    mac: bleDeviceId || nextDevice.mac || ''
  });
  return deviceSession.openDeviceSession({
    device: boundDevice,
    bleDeviceId: bleDeviceId,
    proofCode: proofCode
  }).then((session) => {
    if (!session || !session.token) {
      return Promise.reject({
        code: 'DEVICE_SESSION_REQUIRED',
        message: '设备会话建立失败，请重新连接蓝牙设备'
      });
    }
    return authSession.refreshCurrentSession().then(() => boundDevice);
  }).catch((error) => Promise.reject(mapDeviceSessionError(error)));
}

function getMyDevice() {
  if (!getBaseUrl()) {
    const session = authSession.getStoredSessionSummary();
    return Promise.resolve(session.device || null);
  }

  return request({
    url: ENDPOINTS.devices.mine,
    method: 'GET'
  });
}

function bindLocalDevice(serialNo, proofCode) {
  const device = {
    id: 'dev-' + serialNo,
    serialNo,
    model: 'TXT-HID',
    proofCode
  };
  persistBoundDevice(device);
  return Promise.resolve(device);
}

function bindDevice(serialNo, proofCode) {
  if (!serialNo || !proofCode) {
    return Promise.reject({
      code: 'DEVICE_BIND_REQUIRED_FIELDS',
      message: '请输入设备序列号和校验码'
    });
  }

  if (!getBaseUrl()) {
    return bindLocalDevice(serialNo, proofCode);
  }

  return request({
    url: ENDPOINTS.devices.bind,
    method: 'POST',
    data: { serialNo, proofCode }
  }).then((device) => {
    const nextDevice = normalizeDevicePayload(device);
    return bindAndOpenSession(nextDevice, '', proofCode);
  });
}

function unbindDevice(deviceId, reason) {
  if (!getBaseUrl()) {
    wx.removeStorageSync('boundDevice');
    wx.setStorageSync('deviceBindingStatus', 'not_bound');
    deviceSession.clearDeviceSession();
    return Promise.resolve({ deviceId, reason });
  }

  return request({
    url: ENDPOINTS.devices.unbind,
    method: 'POST',
    data: { deviceId, reason }
  }).then((result) => {
    wx.removeStorageSync('boundDevice');
    wx.setStorageSync('deviceBindingStatus', 'not_bound');
    deviceSession.clearDeviceSession();
    return authSession.refreshCurrentSession()
      .then(() => result)
      .catch(() => result);
  });
}

function autoBind(bleDeviceName, bleDeviceId) {
  if (!getBaseUrl()) {
    const device = {
      id: 'dev-ble-' + Date.now(),
      serialNo: bleDeviceName || 'BLE-AUTO',
      model: 'TXT-HID',
      bleDeviceId: bleDeviceId || '',
      mac: bleDeviceId || ''
    };
    persistBoundDevice(device);
    if (bleDeviceId) {
      bleLink.rememberBleDevice(bleDeviceId, bleDeviceName);
    }
    return Promise.resolve(device);
  }

  return request({
    url: ENDPOINTS.devices.autoBind,
    method: 'POST',
    data: { bleDeviceName: bleDeviceName, bleDeviceId: bleDeviceId }
  }).then((device) => {
    const nextDevice = normalizeDevicePayload(device);
    if (bleDeviceId) {
      bleLink.rememberBleDevice(bleDeviceId, bleDeviceName);
    }
    return bindAndOpenSession(nextDevice, bleDeviceId, nextDevice.proofCode || '0000');
  });
}

module.exports = {
  getMyDevice,
  bindDevice,
  autoBind,
  unbindDevice,
  persistBoundDevice
};
