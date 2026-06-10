const LOCAL_CRYPTO_VERSION = 'dev-local-v1';
const LOCAL_CRYPTO_ALGORITHM = 'dev-local-base64-placeholder';
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function binaryToBase64(binary) {
  let output = '';
  let index = 0;

  while (index < binary.length) {
    const chr1 = binary.charCodeAt(index++);
    const chr2 = binary.charCodeAt(index++);
    const chr3 = binary.charCodeAt(index++);

    const enc1 = chr1 >> 2;
    const enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
    let enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
    let enc4 = chr3 & 63;

    if (Number.isNaN(chr2)) {
      enc3 = 64;
      enc4 = 64;
    } else if (Number.isNaN(chr3)) {
      enc4 = 64;
    }

    output += BASE64_CHARS.charAt(enc1)
      + BASE64_CHARS.charAt(enc2)
      + BASE64_CHARS.charAt(enc3)
      + BASE64_CHARS.charAt(enc4);
  }

  return output;
}

function base64ToBinary(base64) {
  const input = String(base64 || '').replace(/[^A-Za-z0-9+/=]/g, '');
  let output = '';
  let index = 0;

  while (index < input.length) {
    const enc1 = BASE64_CHARS.indexOf(input.charAt(index++));
    const enc2 = BASE64_CHARS.indexOf(input.charAt(index++));
    const enc3 = BASE64_CHARS.indexOf(input.charAt(index++));
    const enc4 = BASE64_CHARS.indexOf(input.charAt(index++));

    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;

    output += String.fromCharCode(chr1);
    if (enc3 !== 64) output += String.fromCharCode(chr2);
    if (enc4 !== 64) output += String.fromCharCode(chr3);
  }

  return output;
}

function toBase64Utf8(text) {
  const input = encodeURIComponent(text || '');
  let binary = '';
  for (let i = 0; i < input.length; i++) {
    binary += String.fromCharCode(input.charCodeAt(i));
  }
  return typeof btoa === 'function' ? btoa(binary) : binaryToBase64(binary);
}

function fromBase64Utf8(base64) {
  const binary = typeof atob === 'function' ? atob(base64 || '') : base64ToBinary(base64 || '');
  let encoded = '';
  for (let i = 0; i < binary.length; i++) {
    encoded += String.fromCharCode(binary.charCodeAt(i));
  }
  return decodeURIComponent(encoded);
}

function protectPlaintext(plaintext, meta) {
  return {
    ciphertext: toBase64Utf8(plaintext || ''),
    envelope: {
      version: LOCAL_CRYPTO_VERSION,
      algorithm: LOCAL_CRYPTO_ALGORITHM,
      keyScope: 'user-local',
      devOnly: true,
      createdAt: Date.now(),
      meta: meta || {}
    }
  };
}

function revealPlaintext(protectedPayload) {
  if (!protectedPayload || !protectedPayload.ciphertext) {
    return '';
  }
  return fromBase64Utf8(protectedPayload.ciphertext);
}

function createContentMetadata(text, extra) {
  const sourceText = text || '';
  return Object.assign({
    textLength: sourceText.length,
    hasContent: sourceText.length > 0
  }, extra || {});
}

module.exports = {
  LOCAL_CRYPTO_VERSION,
  LOCAL_CRYPTO_ALGORITHM,
  protectPlaintext,
  revealPlaintext,
  createContentMetadata
};
