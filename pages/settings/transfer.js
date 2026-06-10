const transferSettings = require('../../services/settings/transfer-settings');

Page({
  data: {
    speedMode: 'balanced',
    systemMode: 'WIN11',
    encodingMode: 'AUTO'
  },

  onLoad(options) {
    const storedSettings = transferSettings.getTransferSettings();
    this.setData({
      speedMode: options.speedMode || storedSettings.speedMode,
      systemMode: options.systemMode || storedSettings.systemMode,
      encodingMode: options.encodingMode || storedSettings.encodingMode
    });
  },

  selectSpeed(e) {
    this.setData({ speedMode: e.currentTarget.dataset.speed });
  },

  selectSystem(e) {
    this.setData({ systemMode: e.currentTarget.dataset.system });
  },

  selectEncoding(e) {
    this.setData({ encodingMode: e.currentTarget.dataset.encoding });
  },

  saveSettings() {
    const { speedMode, systemMode, encodingMode } = this.data;
    transferSettings.saveTransferSettings({ speedMode, systemMode, encodingMode });
    wx.showToast({ title: '设置已保存', icon: 'success' });
  }
});
