const notificationSettings = require('../../services/settings/notification-settings');

Page({
  data: {
    expireReminder: true,
    deviceAlert: true,
    transferDone: false
  },

  onLoad() {
    this.setData(notificationSettings.getNotificationSettings());
  },

  toggleExpireReminder(e) {
    this.setData({ expireReminder: e.detail.value });
  },

  toggleDeviceAlert(e) {
    this.setData({ deviceAlert: e.detail.value });
  },

  toggleTransferDone(e) {
    this.setData({ transferDone: e.detail.value });
  },

  saveSettings() {
    const nextSettings = notificationSettings.saveNotificationSettings({
      expireReminder: this.data.expireReminder,
      deviceAlert: this.data.deviceAlert,
      transferDone: this.data.transferDone
    });
    this.setData(nextSettings);
    wx.showToast({ title: '已保存', icon: 'success' });
  }
});
