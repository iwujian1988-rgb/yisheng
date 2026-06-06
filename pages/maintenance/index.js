// pages/maintenance/index.js
Page({
  data: {},
  goLogs: function () { wx.navigateTo({ url: '/pages/maintenance/logs' }); },
  goConfigCheck: function () { wx.navigateTo({ url: '/pages/maintenance/config-check' }); },
  goCleanup: function () { wx.navigateTo({ url: '/pages/maintenance/cleanup-confirm' }); }
});
