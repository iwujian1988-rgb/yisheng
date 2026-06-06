const LOCAL_CRYPTO_VERSION = 'local-v1';

function toBase64Utf8(text) {
  const input = encodeURIComponent(text || '');
  let binary = '';
  for (let i = 0; i < input.length; i++) {
    binary += String.fromCharCode(input.charCodeAt(i));
  }
  return typeof btoa === 'function'
    ? btoa(binary)
    : Buffer.from(binary, 'binary').toString('base64');
}

function fromBase64Utf8(base64) {
  const binary = typeof atob === 'function'
    ? atob(base64 || '')
    : Buffer.from(base64 || '', 'base64').toString('binary');
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
      algorithm: 'local-base64-placeholder',
      keyScope: 'user-local',
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
  protectPlaintext,
  revealPlaintext,
  createContentMetadata
};
