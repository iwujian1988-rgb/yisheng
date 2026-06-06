// pages/analytics/index.js
Page({
  data: {},
  goUsers: function () { wx.navigateTo({ url: '/pages/analytics/users' }); },
  goDevices: function () { wx.navigateTo({ url: '/pages/analytics/devices' }); },
  goTransfers: function () { wx.navigateTo({ url: '/pages/analytics/transfers' }); },
  goSupport: function () { wx.navigateTo({ url: '/pages/analytics/support' }); }
});
