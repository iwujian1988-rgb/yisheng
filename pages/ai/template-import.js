var featureEntitlements = require('../../services/entitlements/features');

Page({
  onLoad: function () {
    if (!featureEntitlements.guardAiFeature('templates', '场景模板')) {
      wx.navigateBack({ fail: function () { wx.reLaunch({ url: '/pages/home/home' }); } });
      return;
    }
    wx.redirectTo({ url: '/pages/templates/create' });
  }
});
