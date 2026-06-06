const transferSettings = require('../../services/settings/transfer-settings');

Page({
  selectMode(e) {
    const systemMode = e.currentTarget.dataset.mode;
    transferSettings.saveTransferSettings({ systemMode });
    wx.showToast({ title: '已保存', icon: 'success' });
  }
});
