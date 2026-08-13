var DEMO_DEVICE_ID = 'transfer-demo-device';
var DEMO_DEVICE_NAME = '演示设备';

function getAppGlobalData() {
  var app = typeof getApp === 'function' ? getApp() : null;
  return (app && app.globalData) || null;
}

function isEnabled(features) {
  var source = features;
  if (!source) {
    try {
      source = wx.getStorageSync('features') || {};
    } catch (e) {
      source = {};
    }
  }
  return Boolean(source && source.transferDemo === true);
}

function applySessionFeatures(features) {
  var gd = getAppGlobalData();
  if (!gd) return false;

  if (!isEnabled(features)) {
    if (gd.transferDemoActive) {
      gd.bleLinkReady = false;
      gd.bleDeviceId = '';
      gd.bleDeviceName = '';
      gd.deviceConnected = false;
      gd.transferDemoActive = false;
    }
    return false;
  }

  gd.bleLinkReady = true;
  gd.bleDeviceId = DEMO_DEVICE_ID;
  gd.bleDeviceName = DEMO_DEVICE_NAME;
  gd.deviceConnected = true;
  gd.transferDemoActive = true;
  return true;
}

function isActive() {
  var gd = getAppGlobalData();
  return Boolean(gd && gd.transferDemoActive && gd.bleDeviceId === DEMO_DEVICE_ID);
}

module.exports = {
  applySessionFeatures: applySessionFeatures,
  isActive: isActive
};
