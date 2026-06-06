Page({
  goOpenRules() {
    wx.showToast({ title: '等待接入激活码服务', icon: 'none' });
  },

  goDeviceRules() {
    wx.navigateTo({ url: '/pages/admin/device-list' });
  },

  goTestMode() {
    wx.navigateTo({ url: '/pages/qa/test-accounts' });
  }
});
