const featureEntitlements = require('../../services/entitlements/features');

function isDeviceConnected() {
  const app = typeof getApp === 'function' ? getApp() : null;
  const globalData = app && app.globalData ? app.globalData : {};
  return Boolean(globalData.skipBluetoothForDev || globalData.deviceConnected);
}

Page({
  ensureDeviceReady() {
    if (isDeviceConnected()) return true;
    wx.showModal({
      title: '先连接设备',
      content: '除直接编辑外，其余能力需要连接设备后使用。',
      confirmText: '去连接',
      cancelText: '稍后',
      success(res) {
        if (res.confirm) wx.navigateTo({ url: '/pages/transfer/editor?source=manual' });
      }
    });
    return false;
  },

  goManualInput() {
    wx.navigateTo({ url: '/pages/transfer/editor?source=manual' });
  },

  goOcr() {
    if (!featureEntitlements.guardAiFeature('ocr', '图片取字')) return;
    wx.navigateTo({ url: '/pages/ocr/index' });
  },

  goAsr() {
    if (!featureEntitlements.guardAiFeature('asr', '语音成稿')) return;
    wx.navigateTo({ url: '/pages/asr/index' });
  },

  goAi() {
    if (!featureEntitlements.guardAiFeature('aiWriting', '智能润色')) return;
    wx.switchTab({ url: '/pages/ai/detail' });
  },

  goTemplate() {
    if (!featureEntitlements.guardAiFeature('templates', '场景模板')) return;
    wx.navigateTo({ url: '/pages/templates/index' });
  }
});
