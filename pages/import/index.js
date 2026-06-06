Page({
  goManualInput() {
    wx.reLaunch({ url: '/pages/home/home' });
  },

  goOcr() {
    wx.navigateTo({ url: '/pages/ocr/index' });
  },

  goAsr() {
    wx.navigateTo({ url: '/pages/asr/index' });
  },

  goAi() {
    wx.navigateTo({ url: '/pages/ai/index' });
  },

  goTemplate() {
    wx.navigateTo({ url: '/pages/templates/index' });
  }
});
