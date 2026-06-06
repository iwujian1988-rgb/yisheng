// pages/transfer/result.js
Page({
  data: {
    status: 'success',
    errorMessage: ''
  },

  onLoad(options) {
    this.setData({
      status: options.status || 'success',
      errorMessage: options.errorMessage || ''
    });
  },

  goHome() {
    wx.reLaunch({ url: '/pages/home/home' });
  },

  goHistory() {
    wx.navigateTo({ url: '/pages/history/history' });
  }
});
