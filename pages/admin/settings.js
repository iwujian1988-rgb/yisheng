Page({
  goOpenRules() {
    wx.navigateTo({ url: '/pages/admin/activation-list' });
  },

  goDeviceRules() {
    wx.navigateTo({ url: '/pages/admin/device-list' });
  },

  goTestMode() {
    wx.navigateTo({ url: '/pages/qa/test-accounts' });
  }
});
