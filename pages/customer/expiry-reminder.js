// pages/customer/expiry-reminder.js
Page({
  data: { serviceType: '', expiryDate: '', remainDays: '' },
  onLoad: function (options) {
    this.setData({
      serviceType: decodeURIComponent(options.type || ''),
      expiryDate: decodeURIComponent(options.date || ''),
      remainDays: decodeURIComponent(options.days || '')
    });
  },
  contactService: function () { wx.showToast({ title: '等待接入客服', icon: 'none' }); }
});
