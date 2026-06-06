Page({
  goHistory() {
    wx.navigateTo({ url: '/pages/history/history' });
  },

  goContinue() {
    wx.reLaunch({ url: '/pages/home/home' });
  },

  goFeedback() {
    wx.navigateTo({ url: '/pages/feedback/index' });
  }
});
