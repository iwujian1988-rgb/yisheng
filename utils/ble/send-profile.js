function shouldInsertSpace(prevToken, token) {
  return Boolean(prevToken && prevToken.type === 'letter' && token.type === 'vuc');
}

function getTokenDelay(token) {
  let dynamicDelay = 40;
  if (token.type === 'vuc') {
    dynamicDelay = 180;
  } else if (token.type === 'letter') {
    dynamicDelay = 60;
  } else if (token.type === 'normal' && /^[0-9]$/.test(token.value)) {
    dynamicDelay = 100;
  }
  return dynamicDelay;
}

module.exports = {
  shouldInsertSpace,
  getTokenDelay
};

