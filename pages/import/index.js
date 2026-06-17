const featureEntitlements = require('../../services/entitlements/features');

function isDeviceConnected() {
  const app = typeof getApp === 'function' ? getApp() : null;
  const globalData = app && app.globalData ? app.globalData : {};
  return Boolean(globalData.deviceConnected || globalData.bleLinkReady);
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
        if (res.confirm) wx.switchTab({ url: '/pages/home/home' });
      }
    });
    return false;
  },

  goManualInput() {
    wx.switchTab({ url: '/pages/home/home' });
  },

  goOcr() {
    wx.showToast({ title: '请从首页进入图片识别', icon: 'none' });
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
    wx.switchTab({ url: '/pages/templates/index' });
  }
});
