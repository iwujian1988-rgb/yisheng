var deviceSession = require('../device/session');
var liveDevice = require('./live-device');

var PROFESSIONAL_FEATURES = {};

function isBluetoothConnected() {
  var app = typeof getApp === 'function' ? getApp() : null;
  var gd = app && app.globalData;
  return Boolean(gd && gd.bleLinkReady);
}

function hasDeviceSession() {
  return Boolean(deviceSession.getDeviceSessionToken());
}

function hasBoundDevice() {
  var boundDevice = wx.getStorageSync('boundDevice');
  return Boolean(boundDevice && boundDevice.id);
}

function isPaidMember() {
  return wx.getStorageSync('purchaseStatus') === 'paid';
}

function guardAiFeature(featureKey, featureName) {
  if (!isPaidMember()) {
    wx.showModal({
      title: '需要开通会员',
      content: (featureName || '该功能') + '为会员能力，请联系管理员开通后使用。',
      showCancel: false,
      confirmText: '知道了'
    });
    return Promise.resolve(false);
  }

  if (!PROFESSIONAL_FEATURES[featureKey]) {
    return Promise.resolve(true);
  }

  return liveDevice.hasLiveAuthorizedDevice().then(function (live) {
    if (live) return true;
    wx.showModal({
      title: '请先连接设备',
      content: (featureName || '该功能') + '需要先连接蓝牙设备。',
      confirmText: '去连接',
      cancelText: '稍后',
      success: function (res) {
        if (res.confirm) wx.navigateTo({ url: '/pages/bluetooth/index' });
      }
    });
    return false;
  });
}

function guardTransferFeature(featureName) {
  if (!isBluetoothConnected()) {
    wx.showModal({
      title: '请先连接设备',
      content: (featureName || '发送到电脑') + '需要先连接蓝牙设备。',
      confirmText: '去连接',
      cancelText: '稍后',
      success: function (res) {
        if (res.confirm) wx.navigateTo({ url: '/pages/bluetooth/index' });
      }
    });
    return false;
  }
  return true;
}

module.exports = {
  guardAiFeature: guardAiFeature,
  guardTransferFeature: guardTransferFeature,
  hasBoundDevice: hasBoundDevice,
  hasDeviceSession: hasDeviceSession,
  isBluetoothConnected: isBluetoothConnected,
  isPaidMember: isPaidMember
};
