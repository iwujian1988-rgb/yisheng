// pages/about/index.js
Page({
  data: {
    version: ''
  },

  onLoad(options) {
    this.setData({ version: options.version || '' });
  },

  goToServiceIntro() {
    wx.navigateTo({ url: '/pages/help/help' });
  },

  goToPrivacy() {
    wx.navigateTo({ url: '/pages/common/agreement?type=privacyPolicy' });
  },

  goToAgreement() {
    wx.navigateTo({ url: '/pages/common/agreement?type=userAgreement' });
  }
});
