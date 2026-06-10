const crypto = require('crypto');

function hashPassword(password, salt) {
  var passwordSalt = salt || crypto.randomBytes(16).toString('hex');
  var digest = crypto.pbkdf2Sync(String(password), passwordSalt, 120000, 32, 'sha256').toString('hex');
  return 'pbkdf2$' + passwordSalt + '$' + digest;
}

function verifyPassword(password, storedHash) {
  var parts = String(storedHash || '').split('$');
  if (parts.length !== 3 || parts[0] !== 'pbkdf2') return false;
  var next = hashPassword(password, parts[1]);
  if (Buffer.byteLength(next) !== Buffer.byteLength(storedHash)) return false;
  return crypto.timingSafeEqual(Buffer.from(next), Buffer.from(storedHash));
}

module.exports = {
  hashPassword,
  verifyPassword
};
