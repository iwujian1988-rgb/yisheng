const LOCAL_CRYPTO_VERSION = 'dev-local-v1';
const LOCAL_CRYPTO_ALGORITHM = 'dev-local-base64-placeholder';

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
