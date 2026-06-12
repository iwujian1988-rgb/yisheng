const featureEntitlements = require('../../services/entitlements/features');

Page({
  data: {},

  goScenario() {
    wx.navigateTo({ url: '/pages/demo/scenario-select' });
  },

  goDevice() {
    wx.navigateTo({ url: '/pages/device/checklist' });
  },

  goTransfer() {
    wx.navigateTo({ url: '/pages/transfer/queue' });
  },

  goAI() {
    if (!featureEntitlements.guardAiFeature('aiWriting', '智能创作')) return;
    wx.navigateTo({ url: '/pages/ai/detail' });
  }
});
