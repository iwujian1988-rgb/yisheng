const deviceSession = require('../device/session');

const PROFESSIONAL_FEATURES = {
  aiTemplateEnhance: true,
  professionalAi: true,
  professionalTemplates: true,
  templates: true,
  aiWriting: true,
  ocr: true,
  asr: true
};

function isBluetoothConnected() {
  var app = typeof getApp === 'function' ? getApp() : null;
  var gd = app && app.globalData;
  return Boolean(gd && gd.bleLinkReady);
}

function hasDeviceSession() {
  return Boolean(deviceSession.getDeviceSessionToken());
}

function hasBoundDevice() {
  const boundDevice = wx.getStorageSync('boundDevice');
  return Boolean(boundDevice && boundDevice.id);
}

function guardAiFeature(featureKey, featureName) {
  if (wx.getStorageSync('purchaseStatus') !== 'paid') {
    wx.showModal({
      title: '需要开通服务',
      content: (featureName || '该功能') + '为会员能力，请开通后使用。',
      confirmText: '去开通',
      cancelText: '稍后',
      success: function (res) {
        if (res.confirm) wx.navigateTo({ url: '/pages/purchase/index' });
      }
    });
    return false;
  }

  if (PROFESSIONAL_FEATURES[featureKey] && !hasBoundDevice()) {
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
  }

  return true;
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
  isBluetoothConnected: isBluetoothConnected
};
