function toVucValue(char) {
  let hex = char.charCodeAt(0).toString(16).toUpperCase();
  while (hex.length < 4) {
    hex = '0' + hex;
  }
  return 'VUC' + hex;
}

function isChineseOrFullWidth(char) {
  return /[\u4e00-\u9fa5]|[\u3000-\u303f]|[\uff00-\uffef]/.test(char);
}

function textToTokens(text) {
  const tokens = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (isChineseOrFullWidth(char)) {
      tokens.push({ type: 'vuc', value: toVucValue(char) });
    } else if (char === ' ' || char === '　') {
      tokens.push({ type: 'normal', value: char });
    } else if (char === '(' || char === ')') {
      tokens.push({ type: 'vuc', value: toVucValue(char) });
    } else if (/[a-z]/.test(char)) {
      tokens.push({ type: 'letter', value: char });
    } else if (/[A-Z]/.test(char)) {
      tokens.push({ type: 'letter', value: char });
    } else if (/[0-9]/.test(char)) {
      tokens.push({ type: 'normal', value: char });
    } else {
      tokens.push({ type: 'normal', value: char });
    }
  }

  return tokens;
}

function tokensToPreview(tokens) {
  return tokens.map((token) => token.value).join(',');
}

module.exports = {
  textToTokens,
  tokensToPreview
};

