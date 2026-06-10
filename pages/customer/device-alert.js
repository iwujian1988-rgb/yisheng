Page({
  data: { alertMsg: '', deviceName: '', alertType: '', alertTime: '' },

  onLoad(options) {
    this.setData({
      alertMsg: decodeURIComponent(options.msg || ''),
      deviceName: decodeURIComponent(options.device || ''),
      alertType: decodeURIComponent(options.type || ''),
      alertTime: decodeURIComponent(options.time || '')
    });
  },

  contactSupport() {
    wx.navigateTo({
      url: '/pages/support/device-issue?serialNo=' + encodeURIComponent(this.data.deviceName || '')
    });
  }
});
