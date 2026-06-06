// pages/legal/index.js
Page({
  data: {},
  goDisclaimer: function () { wx.navigateTo({ url: '/pages/legal/disclaimer' }); },
  goDataProcessing: function () { wx.navigateTo({ url: '/pages/legal/data-processing' }); }
});
