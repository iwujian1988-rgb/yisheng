var crypto = require('crypto');
var { createId, nowIso } = require('./ids');

var SESSION_KEY_TTL_MS = 5 * 60 * 1000;

function ensureCollection(store) {
  if (!Array.isArray(store.wechatSessionKeys)) store.wechatSessionKeys = [];
}

function cleanupExpired(store) {
  ensureCollection(store);
  var now = Date.now();
  store.wechatSessionKeys = store.wechatSessionKeys.filter(function (item) {
    return new Date(item.expiresAt).getTime() > now;
  });
}

function storeSessionKey(store, openid, sessionKey, unionid) {
  if (!openid || !sessionKey) return null;
  ensureCollection(store);
  cleanupExpired(store);
  var existing = store.wechatSessionKeys.find(function (item) {
    return item.openid === openid;
  });
  var now = nowIso();
  var expiresAt = new Date(Date.now() + SESSION_KEY_TTL_MS).toISOString();
  if (existing) {
    existing.sessionKey = sessionKey;
    existing.unionid = unionid || existing.unionid || '';
    existing.expiresAt = expiresAt;
    existing.updatedAt = now;
    return existing;
  }
  var entry = {
    id: createId('wxsk'),
    openid: openid,
    unionid: unionid || '',
    sessionKey: sessionKey,
    expiresAt: expiresAt,
    createdAt: now,
    updatedAt: now
  };
  store.wechatSessionKeys.push(entry);
  return entry;
}

function getSessionKey(store, openid) {
  ensureCollection(store);
  cleanupExpired(store);
  var entry = store.wechatSessionKeys.find(function (item) {
    return item.openid === openid;
  });
  return entry ? entry.sessionKey : '';
}

function removeByOpenid(store, openid) {
  ensureCollection(store);
  store.wechatSessionKeys = store.wechatSessionKeys.filter(function (item) {
    return item.openid !== openid;
  });
}

module.exports = {
  SESSION_KEY_TTL_MS: SESSION_KEY_TTL_MS,
  storeSessionKey: storeSessionKey,
  getSessionKey: getSessionKey,
  removeByOpenid: removeByOpenid
};
