const transferSettings = require('../../services/settings/transfer-settings');

Page({
  data: {
    speedMode: 'balanced'
  },

  onLoad(options) {
    const storedSettings = transferSettings.getTransferSettings();
    this.setData({
      speedMode: options.speedMode || storedSettings.speedMode
    });
  },

  selectSpeed(e) {
    const speedMode = e.currentTarget.dataset.speed;
    if (!speedMode || speedMode === this.data.speedMode) {
      return;
    }
    transferSettings.saveTransferSettings({ speedMode });
    this.setData({ speedMode });
    const summary = transferSettings.getSpeedModeSummary(speedMode);
    wx.showToast({ title: summary.text, icon: 'none' });
  }
});
