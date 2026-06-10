const { request, getBaseUrl } = require('../api/client');
const { ENDPOINTS } = require('../api/endpoints');
const authSession = require('../auth/session');

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
    return authSession.refreshCurrentSession()
      .then(() => nextDevice)
      .catch(() => nextDevice);
  });
}

function unbindDevice(deviceId, reason) {
  if (!getBaseUrl()) {
    wx.removeStorageSync('boundDevice');
    wx.setStorageSync('deviceBindingStatus', 'not_bound');
    wx.setStorageSync('accountStatus', 'active');
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
    return authSession.refreshCurrentSession()
      .then(() => result)
      .catch(() => result);
  });
}

module.exports = {
  getMyDevice,
  bindDevice,
  unbindDevice,
  persistBoundDevice
};
