// pages/error/index.js
Page({
  data: {
    title: '',
    message: '',
    primaryText: '',
    secondaryText: ''
  },

  onLoad(options) {
    this.setData({
      title: options.title || '',
      message: options.message || '',
      primaryText: options.primaryText || '',
      secondaryText: options.secondaryText || ''
    });
  },

  primaryAction() {
    wx.reLaunch({ url: '/pages/home/home' });
  },

  secondaryAction() {
    wx.navigateBack({ fail: () => wx.reLaunch({ url: '/pages/home/home' }) });
  }
});
