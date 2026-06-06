const transferSettings = require('../../services/settings/transfer-settings');

Page({
  data: {
    speedMode: 'balanced',
    systemMode: 'WIN11'
  },

  onLoad(options) {
    const storedSettings = transferSettings.getTransferSettings();
    this.setData({
      speedMode: options.speedMode || storedSettings.speedMode,
      systemMode: options.systemMode || storedSettings.systemMode
    });
  },

  selectSpeed(e) {
    this.setData({ speedMode: e.currentTarget.dataset.speed });
  },

  selectSystem(e) {
    this.setData({ systemMode: e.currentTarget.dataset.system });
  },

  saveSettings() {
    const { speedMode, systemMode } = this.data;
    transferSettings.saveTransferSettings({ speedMode, systemMode });
    wx.showToast({ title: '设置已保存', icon: 'success' });
  }
});
