function toVucValue(char) {
  let hex = char.charCodeAt(0).toString(16).toUpperCase();
  while (hex.length < 4) {
    hex = '0' + hex;
  }
  return 'VUC' + hex;
}

function shouldUseVuc(char) {
  // The BLE packet writer is byte-oriented. Sending a non-ASCII character as a
  // normal packet truncates its Unicode value (for example, ≥ becomes "e"),
  // leaves Microsoft Pinyin in an unfinished composition, and makes following
  // VUC commands leak as literal text. Route every BMP non-ASCII character
  // through Windows Pinyin's Unicode input path instead.
  return char.charCodeAt(0) > 0x7F || char === '(' || char === ')';
}

function textToTokens(text) {
  const tokens = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (shouldUseVuc(char)) {
      tokens.push({ type: 'vuc', value: toVucValue(char) });
    } else if (char === ' ' || char === '　') {
      tokens.push({ type: 'normal', value: char });
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
