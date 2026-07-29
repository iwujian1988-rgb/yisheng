const featureEntitlements = require('../../services/entitlements/features');

Page({
  goManualInput() {
    wx.switchTab({ url: '/pages/home/home' });
  },

  goOcr() {
    wx.showToast({ title: '请从首页进入图片识别', icon: 'none' });
  },

  goAsr() {
    featureEntitlements.guardAiFeature('asr', '语音成稿').then(function (ok) {
      if (!ok) return;
      wx.navigateTo({ url: '/pages/asr/index' });
    });
  },

  goAi() {
    featureEntitlements.guardAiFeature('aiWriting', '智能润色').then(function (ok) {
      if (!ok) return;
      wx.switchTab({ url: '/pages/ai/detail' });
    });
  },

  goTemplate() {
    featureEntitlements.guardAiFeature('templates', '场景模板').then(function (ok) {
      if (!ok) return;
      wx.switchTab({ url: '/pages/templates/index' });
    });
  }
});
