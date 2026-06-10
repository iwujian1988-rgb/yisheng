Page({
  goConnectDevice() {
    wx.navigateTo({ url: '/pages/device/checklist' });
  },

  goSendText() {
    wx.reLaunch({ url: '/pages/home/home' });
  },

  goTutorial() {
    wx.navigateTo({ url: '/pages/tutorials/index' });
  }
});
