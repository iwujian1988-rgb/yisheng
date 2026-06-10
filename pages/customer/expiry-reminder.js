Page({
  data: { serviceType: '', expiryDate: '', remainDays: '' },

  onLoad(options) {
    this.setData({
      serviceType: decodeURIComponent(options.type || ''),
      expiryDate: decodeURIComponent(options.date || ''),
      remainDays: decodeURIComponent(options.days || '')
    });
  },

  contactService() {
    wx.navigateTo({ url: '/pages/purchase/index' });
  }
});
