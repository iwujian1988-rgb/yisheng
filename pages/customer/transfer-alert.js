// pages/customer/transfer-alert.js
Page({
  data: { alertMsg: '', transferTime: '', alertType: '', deviceName: '' },
  onLoad: function (options) {
    this.setData({
      alertMsg: decodeURIComponent(options.msg || ''),
      transferTime: decodeURIComponent(options.time || ''),
      alertType: decodeURIComponent(options.type || ''),
      deviceName: decodeURIComponent(options.device || '')
    });
  },
  retryTransfer: function () { wx.showToast({ title: '等待接入重传服务', icon: 'none' }); },
  contactSupport: function () { wx.showToast({ title: '等待接入技术支持', icon: 'none' }); }
});
