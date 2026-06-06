// pages/release/rollback-confirm.js
Page({
  data: {},
  confirmRollback: function () { wx.showToast({ title: '等待接入回滚服务', icon: 'none' }); },
  goBack: function () { wx.navigateBack(); }
});
