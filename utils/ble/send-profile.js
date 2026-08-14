const transferSettings = require('../../services/settings/transfer-settings');

function shouldInsertSpace(prevToken, token) {
  return Boolean(prevToken && prevToken.type === 'letter' && token.type === 'vuc');
}

function getTokenDelay(token, speedMode) {
  const selectedSpeedMode = speedMode || transferSettings.getTransferSettings().speedMode;
  const delays = transferSettings.getSpeedDelays(selectedSpeedMode);

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
