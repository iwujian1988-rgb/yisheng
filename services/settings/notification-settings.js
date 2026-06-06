const DEFAULT_NOTIFICATION_SETTINGS = {
  expireReminder: true,
  deviceAlert: true,
  transferDone: false
};

function getNotificationSettings() {
  const settings = wx.getStorageSync('notificationSettings');
  if (settings && typeof settings === 'object') {
    return Object.assign({}, DEFAULT_NOTIFICATION_SETTINGS, settings);
  }
  return Object.assign({}, DEFAULT_NOTIFICATION_SETTINGS);
}

function saveNotificationSettings(settings) {
  const nextSettings = Object.assign({}, DEFAULT_NOTIFICATION_SETTINGS, settings);
  wx.setStorageSync('notificationSettings', nextSettings);
  return nextSettings;
}

module.exports = {
  DEFAULT_NOTIFICATION_SETTINGS,
  getNotificationSettings,
  saveNotificationSettings
};
