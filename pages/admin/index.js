Page({
  goPaidUsers() {
    wx.navigateTo({ url: '/pages/admin/paid-user-list' });
  },

  goDevices() {
    wx.navigateTo({ url: '/pages/admin/device-list' });
  },

  goServiceRecords() {
    wx.navigateTo({ url: '/pages/admin/service-records' });
  },

  goFeedback() {
    wx.navigateTo({ url: '/pages/admin/feedback-review' });
  }
});
