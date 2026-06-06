// pages/support/index.js
Page({
  contactSupport() {
    wx.showToast({ title: '等待接入客服服务', icon: 'none' });
  },

  reportDeviceIssue() {
    wx.navigateTo({ url: '/pages/support/device-issue' });
  },

  reportAccountIssue() {
    wx.showToast({ title: '等待接入客服服务', icon: 'none' });
  },

  reportTransferIssue() {
    wx.showToast({ title: '等待接入客服服务', icon: 'none' });
  }
});
