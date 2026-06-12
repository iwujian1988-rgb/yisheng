const { request, getBaseUrl } = require('../api/client');
const { ENDPOINTS } = require('../api/endpoints');
const authSession = require('../auth/session');
const deviceSession = require('./session');

function persistBoundDevice(device) {
  wx.setStorageSync('boundDevice', device);
  wx.setStorageSync('deviceBindingStatus', 'bound');
  wx.setStorageSync('purchaseStatus', 'paid');
  wx.setStorageSync('serviceStatus', 'active');
  wx.setStorageSync('accountStatus', 'active');
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
    const nextDevice = device && device.device ? device.device : device;
    persistBoundDevice(nextDevice);
    return deviceSession.openDeviceSession({ device: nextDevice, proofCode: proofCode })
      .catch(() => null)
      .then(() => authSession.refreshCurrentSession())
      .then(() => nextDevice)
      .catch(() => nextDevice);
  });
}

function unbindDevice(deviceId, reason) {
  if (!getBaseUrl()) {
    wx.removeStorageSync('boundDevice');
    wx.setStorageSync('deviceBindingStatus', 'not_bound');
    wx.setStorageSync('accountStatus', 'active');
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
    wx.setStorageSync('accountStatus', 'active');
    deviceSession.clearDeviceSession();
    return authSession.refreshCurrentSession()
      .then(() => result)
      .catch(() => result);
  });
}

function autoBind(bleDeviceName, bleDeviceId) {
  if (!getBaseUrl()) {
    var device = {
      id: 'dev-ble-' + Date.now(),
      serialNo: bleDeviceName || 'BLE-AUTO',
      model: 'TXT-HID',
      bleDeviceId: bleDeviceId || ''
    };
    persistBoundDevice(device);
    return Promise.resolve(device);
  }

  return request({
    url: ENDPOINTS.devices.autoBind,
    method: 'POST',
    data: { bleDeviceName: bleDeviceName, bleDeviceId: bleDeviceId }
  }).then(function (device) {
    var nextDevice = device && device.device ? device.device : device;
    persistBoundDevice(nextDevice);
    return deviceSession.openDeviceSession({
      device: nextDevice,
      bleDeviceId: bleDeviceId
    }).catch(function () { return null; })
      .then(function () { return authSession.refreshCurrentSession(); })
      .then(function () { return nextDevice; })
      .catch(function () { return nextDevice; });
  });
}

module.exports = {
  getMyDevice,
  bindDevice,
  autoBind,
  unbindDevice,
  persistBoundDevice
};
