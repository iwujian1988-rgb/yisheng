const crypto = require('crypto');

function createId(prefix) {
  return (prefix || 'id') + '_' + crypto.randomBytes(8).toString('hex');
}

function nowIso() {
  return new Date().toISOString();
}

module.exports = {
  createId,
  nowIso
};
