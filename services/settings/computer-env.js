const DEFAULT_COMPUTER_ENV = {
  env: ''
};

function getComputerEnv() {
  const settings = wx.getStorageSync('computerEnvSettings');
  if (settings && typeof settings === 'object') {
    return Object.assign({}, DEFAULT_COMPUTER_ENV, settings);
  }
  return Object.assign({}, DEFAULT_COMPUTER_ENV);
}

function saveComputerEnv(env) {
  const settings = { env: env || '' };
  wx.setStorageSync('computerEnvSettings', settings);
  return settings;
}

module.exports = {
  getComputerEnv,
  saveComputerEnv
};
