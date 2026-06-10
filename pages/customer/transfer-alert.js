Page({
  data: { alertMsg: '', transferTime: '', alertType: '', deviceName: '' },

  onLoad(options) {
    this.setData({
      alertMsg: decodeURIComponent(options.msg || ''),
      transferTime: decodeURIComponent(options.time || ''),
      alertType: decodeURIComponent(options.type || ''),
      deviceName: decodeURIComponent(options.device || '')
    });
  },

  retryTransfer() {
    wx.navigateTo({ url: '/pages/transfer/queue' });
  },

  contactSupport() {
    wx.navigateTo({ url: '/pages/transfer/failure-reason' });
  }
});
