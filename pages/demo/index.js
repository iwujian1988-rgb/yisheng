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
    wx.navigateTo({ url: '/pages/ai/detail' });
  }
});
