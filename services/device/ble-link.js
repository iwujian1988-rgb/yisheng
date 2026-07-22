var liveHeartbeat = require('./live-heartbeat');

function getAppGlobalData() {
  const app = typeof getApp === 'function' ? getApp() : null;
  return (app && app.globalData) || {};
}

function getStoredBleDeviceId() {
  const gd = getAppGlobalData();
  if (gd.bleDeviceId) return gd.bleDeviceId;

  const boundDevice = wx.getStorageSync('boundDevice');
  if (!boundDevice || typeof boundDevice !== 'object') return '';

  return boundDevice.bleDeviceId || boundDevice.mac || '';
}

function rememberBleDevice(deviceId, deviceName) {
  if (!deviceId) return;
  const gd = getAppGlobalData();
  gd.bleDeviceId = deviceId;
  gd.bleDeviceName = deviceName || gd.bleDeviceName || '';
  gd.bleLinkReady = false;

  const boundDevice = wx.getStorageSync('boundDevice');
  if (boundDevice && typeof boundDevice === 'object') {
    wx.setStorageSync('boundDevice', Object.assign({}, boundDevice, {
      bleDeviceId: deviceId,
      mac: boundDevice.mac || deviceId
    }));
  }
}

function markBleLinkReady(deviceId) {
  const gd = getAppGlobalData();
  gd.bleDeviceId = deviceId || gd.bleDeviceId || '';
  gd.bleLinkReady = Boolean(gd.bleDeviceId);
  if (gd.bleLinkReady) {
    gd.deviceConnected = true;
    liveHeartbeat.start();
  }
}

function clearBleLink() {
  const gd = getAppGlobalData();
  gd.bleDeviceId = '';
  gd.bleDeviceName = '';
  gd.bleLinkReady = false;
  gd.deviceConnected = Boolean(wx.getStorageSync('boundDevice') && wx.getStorageSync('boundDevice').id);
  liveHeartbeat.stop();
}

function isAccountBound() {
  const boundDevice = wx.getStorageSync('boundDevice');
  return Boolean(boundDevice && boundDevice.id);
}

function isBleLinkReady() {
  const gd = getAppGlobalData();
  return Boolean(gd.bleLinkReady && gd.bleDeviceId);
}

module.exports = {
  clearBleLink,
  getStoredBleDeviceId,
  isAccountBound,
  isBleLinkReady,
  markBleLinkReady,
  rememberBleDevice
};
