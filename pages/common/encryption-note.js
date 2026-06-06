Page({
  confirmRead() {
    wx.navigateBack({
      delta: 1,
      fail: () => {
        wx.navigateTo({ url: '/pages/settings/privacy' });
      }
    });
  }
});
