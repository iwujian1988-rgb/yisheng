const transferSettings = require('../../services/settings/transfer-settings');

function shouldInsertSpace(prevToken, token) {
  return Boolean(prevToken && prevToken.type === 'letter' && token.type === 'vuc');
}

function getTokenDelay(token) {
  const { speedMode } = transferSettings.getTransferSettings();
  const delays = transferSettings.getSpeedDelays(speedMode);

  if (token.type === 'vuc') {
    return delays.vuc;
  }
  if (token.type === 'letter') {
    return delays.letter;
  }
  if (token.type === 'normal' && /^[0-9]$/.test(token.value)) {
    return delays.digit;
  }
  return delays.default;
}

module.exports = {
  shouldInsertSpace,
  getTokenDelay
};
