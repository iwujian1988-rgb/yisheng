// pages/customer/device-alert.js
Page({
  data: { alertMsg: '', deviceName: '', alertType: '', alertTime: '' },
  onLoad: function (options) {
    this.setData({
      alertMsg: decodeURIComponent(options.msg || ''),
      deviceName: decodeURIComponent(options.device || ''),
      alertType: decodeURIComponent(options.type || ''),
      alertTime: decodeURIComponent(options.time || '')
    });
  },
  contactSupport: function () { wx.showToast({ title: '等待接入技术支持', icon: 'none' }); }
});
