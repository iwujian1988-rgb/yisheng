Page({
  data: {
    serialNo: ''
  },

  onLoad(options) {
    this.setData({
      serialNo: options.serialNo ? decodeURIComponent(options.serialNo) : ''
    });
  },

  goNext() {
    wx.reLaunch({ url: '/pages/home/home' });
  },

  goTutorial() {
    wx.navigateTo({ url: '/pages/tutorials/connect-guide' });
  }
});
