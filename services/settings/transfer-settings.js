const DEFAULT_TRANSFER_SETTINGS = {
  speedMode: 'balanced',
  systemMode: 'WIN11'
};

function getTransferSettings() {
  const settings = wx.getStorageSync('transferSettings');
  if (settings && typeof settings === 'object') {
    return Object.assign({}, DEFAULT_TRANSFER_SETTINGS, settings);
  }
  return Object.assign({}, DEFAULT_TRANSFER_SETTINGS);
}

function saveTransferSettings(settings) {
  const nextSettings = Object.assign({}, DEFAULT_TRANSFER_SETTINGS, settings);
  wx.setStorageSync('transferSettings', nextSettings);
  return nextSettings;
}

module.exports = {
  DEFAULT_TRANSFER_SETTINGS,
  getTransferSettings,
  saveTransferSettings
};

