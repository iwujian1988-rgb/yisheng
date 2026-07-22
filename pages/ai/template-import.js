var featureEntitlements = require('../../services/entitlements/features');

Page({
  onLoad: function () {
    featureEntitlements.guardAiFeature('templates', '场景模板').then(function (ok) {
      if (!ok) {
        wx.navigateBack({ fail: function () { wx.reLaunch({ url: '/pages/home/home' }); } });
        return;
      }
      wx.redirectTo({ url: '/pages/templates/create' });
    });
  }
});
