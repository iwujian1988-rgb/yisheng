const DEFAULT_PRIVACY_SETTINGS = {
  saveHistory: true
};

function getPrivacySettings() {
  const settings = wx.getStorageSync('privacySettings');
  if (settings && typeof settings === 'object') {
    return Object.assign({}, DEFAULT_PRIVACY_SETTINGS, settings);
  }
  return Object.assign({}, DEFAULT_PRIVACY_SETTINGS);
}

function savePrivacySettings(settings) {
  const nextSettings = Object.assign({}, DEFAULT_PRIVACY_SETTINGS, settings);
  wx.setStorageSync('privacySettings', nextSettings);
  return nextSettings;
}

module.exports = {
  DEFAULT_PRIVACY_SETTINGS,
  getPrivacySettings,
  savePrivacySettings
};
