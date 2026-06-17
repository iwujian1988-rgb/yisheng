Page({
  goHistory() {
    wx.reLaunch({ url: '/pages/home/home' });
  },

  goContinue() {
    wx.reLaunch({ url: '/pages/home/home' });
  },

  goFeedback() {
    wx.navigateTo({ url: '/pages/feedback/index' });
  }
});
