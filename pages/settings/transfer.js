const transferSettings = require('../../services/settings/transfer-settings');

Page({
  data: {
    speedMode: 'balanced',
    transferLocked: false
  },

  onLoad(options) {
    const storedSettings = transferSettings.getTransferSettings();
    this.setData({
      speedMode: options.speedMode || storedSettings.speedMode
    });
  },

  onShow() {
    this.setData({ transferLocked: transferSettings.isTransferSpeedLocked() });
  },

  selectSpeed(e) {
    if (transferSettings.isTransferSpeedLocked()) {
      this.setData({ transferLocked: true });
      wx.showToast({ title: '发送完成后再调整速度', icon: 'none' });
      return;
    }
    const speedMode = e.currentTarget.dataset.speed;
    if (!speedMode || speedMode === this.data.speedMode) {
      return;
    }
    const saved = transferSettings.saveTransferSettings({ speedMode });
    if (saved.locked) {
      this.setData({ transferLocked: true });
      wx.showToast({ title: '发送完成后再调整速度', icon: 'none' });
      return;
    }
    this.setData({ speedMode });
    const summary = transferSettings.getSpeedModeSummary(speedMode);
    wx.showToast({ title: summary.text, icon: 'none' });
  }
});
