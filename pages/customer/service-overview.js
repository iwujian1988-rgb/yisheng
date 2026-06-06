const milestones = require('../../services/customer/milestones');

Page({
  data: {
    serviceExpiry: '',
    serviceStatus: '',
    deviceSerial: '',
    deviceStatus: '',
    lastTransfer: ''
  },

  onLoad(options) {
    const fromOptions = {};
    ['serviceExpiry', 'serviceStatus', 'deviceSerial', 'deviceStatus', 'lastTransfer'].forEach((key) => {
      if (options[key]) {
        fromOptions[key] = decodeURIComponent(options[key]);
      }
    });
    this.setData(Object.assign({}, milestones.getServiceOverview(), fromOptions));
  },

  goTransfer() {
    wx.reLaunch({ url: '/pages/home/home' });
  },

  goHistory() {
    wx.navigateTo({ url: '/pages/history/history' });
  },

  goHelp() {
    wx.navigateTo({ url: '/pages/help/help' });
  }
});
