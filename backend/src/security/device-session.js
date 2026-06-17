const crypto = require('crypto');
const { config } = require('../config');
const { createId, nowIso } = require('./ids');
const { verifyPassword } = require('./password');

const DEVICE_SESSION_TTL_MS = 15 * 60 * 1000;
const CHALLENGE_TTL_MS = 60 * 1000;
const ALL_CAPABILITIES = [
  'professional_templates',
  'professional_ai',
  'professional_quick_actions',
  'ocr',
  'asr'
];

function ensureCollections(store) {
  if (!Array.isArray(store.deviceSessionChallenges)) store.deviceSessionChallenges = [];
  if (!Array.isArray(store.deviceSessions)) store.deviceSessions = [];
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function createToken() {
  return crypto.randomBytes(32).toString('hex');
}

function getDeviceSessionToken(req) {
  return String(
    req.headers['x-device-session'] ||
    req.headers['x-device-session-token'] ||
    ''
  ).trim();
}

function isMemberActive(store, userId) {
  var user = (store.users || []).find((item) => item.id === userId);
  return Boolean(user && user.memberStatus === 'active');
}

function findBoundDevice(store, userId, payload) {
  var body = payload || {};
  var serialNo = String(body.serialNo || '').trim();
  var deviceId = String(body.deviceId || '').trim();
  var bleDeviceId = String(body.bleDeviceId || '').trim();

  if (deviceId) {
    var matchedById = (store.devices || []).find((device) => {
      return device.id === deviceId &&
        device.boundUserId === userId &&
        device.bindStatus === 'bound';
    });
    if (matchedById) return matchedById;
  }

  return (store.devices || []).find((device) => {
    if (device.boundUserId !== userId || device.bindStatus !== 'bound') return false;
    if (serialNo && device.serialNo !== serialNo) return false;
    if (bleDeviceId && device.mac && device.mac !== bleDeviceId) return false;
    return true;
  }) || null;
}

function cleanupExpired(store) {
  ensureCollections(store);
  var now = Date.now();
  store.deviceSessionChallenges = store.deviceSessionChallenges.filter((item) => {
    return !item.usedAt && new Date(item.expiresAt).getTime() > now;
  });
  store.deviceSessions = store.deviceSessions.filter((item) => {
    return !item.revokedAt && new Date(item.expiresAt).getTime() > now;
  });
}

function createChallenge(store, userId, device) {
  ensureCollections(store);
  cleanupExpired(store);
  var item = {
    id: createId('dsch'),
    userId: userId,
    deviceId: device.id,
    serialNo: device.serialNo || '',
    nonce: crypto.randomBytes(16).toString('hex'),
    expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
    usedAt: '',
    createdAt: nowIso()
  };
  store.deviceSessionChallenges.push(item);
  return item;
}

function issueDeviceSession(store, userId, device, source) {
  ensureCollections(store);
  cleanupExpired(store);
  var token = createToken();
  var now = nowIso();
  var session = {
    id: createId('dss'),
    tokenHash: hashToken(token),
    userId: userId,
    deviceId: device.id,
    serialNo: device.serialNo || '',
    capabilities: ALL_CAPABILITIES.slice(),
    source: source || 'bluetooth',
    expiresAt: new Date(Date.now() + DEVICE_SESSION_TTL_MS).toISOString(),
    revokedAt: '',
    createdAt: now,
    updatedAt: now,
    lastSeenAt: now
  };
  store.deviceSessions.push(session);
  return {
    deviceSessionToken: token,
    expiresAt: session.expiresAt,
    capabilities: session.capabilities,
    device: {
      id: device.id,
      serialNo: device.serialNo || '',
      model: device.model || ''
    }
  };
}

function verifyDeviceProof(device, proof) {
  var value = String(proof || '').trim();
  if (device.proofCodeHash) {
    return Boolean(value && verifyPassword(value, device.proofCodeHash));
  }
  if (config.env === 'production') {
    return false;
  }
  return true;
}

function verifyChallengeAndIssue(store, userId, body) {
  ensureCollections(store);
  cleanupExpired(store);
  var challengeId = String(body.challengeId || '').trim();
  var challenge = store.deviceSessionChallenges.find((item) => {
    return item.id === challengeId && item.userId === userId && !item.usedAt;
  });
  if (!challenge) {
    return { ok: false, code: 'DEVICE_CHALLENGE_INVALID', message: 'device challenge is invalid or expired' };
  }
  if (new Date(challenge.expiresAt).getTime() <= Date.now()) {
    return { ok: false, code: 'DEVICE_CHALLENGE_EXPIRED', message: 'device challenge expired' };
  }
  var device = findBoundDevice(store, userId, {
    deviceId: challenge.deviceId,
    serialNo: challenge.serialNo
  });
  if (!device) {
    return { ok: false, code: 'DEVICE_NOT_BOUND', message: 'device is not bound to current user' };
  }
  if (!isMemberActive(store, userId)) {
    return { ok: false, code: 'MEMBER_REQUIRED', message: 'professional features require active membership' };
  }
  var proof = body.response || body.proof || body.hardwareCode || body.proofCode || '';
  if (!verifyDeviceProof(device, proof)) {
    return { ok: false, code: 'DEVICE_SESSION_PROOF_INVALID', message: 'device proof invalid' };
  }
  challenge.usedAt = nowIso();
  return { ok: true, data: issueDeviceSession(store, userId, device, 'bluetooth') };
}

function resolveDeviceSession(store, req, userId, capability) {
  ensureCollections(store);
  cleanupExpired(store);
  var token = getDeviceSessionToken(req);
  if (!token) {
    return { ok: false, code: 'DEVICE_SESSION_REQUIRED', message: 'device session required' };
  }
  var tokenHash = hashToken(token);
  var session = store.deviceSessions.find((item) => item.tokenHash === tokenHash && !item.revokedAt);
  if (!session) {
    return { ok: false, code: 'DEVICE_SESSION_INVALID', message: 'device session invalid' };
  }
  if (session.userId !== userId) {
    return { ok: false, code: 'DEVICE_SESSION_FORBIDDEN', message: 'device session does not belong to current user' };
  }
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    session.revokedAt = nowIso();
    return { ok: false, code: 'DEVICE_SESSION_EXPIRED', message: 'device session expired' };
  }
  var device = findBoundDevice(store, userId, {
    deviceId: session.deviceId,
    serialNo: session.serialNo
  });
  if (!device) {
    return { ok: false, code: 'DEVICE_NOT_BOUND', message: 'device is not bound to current user' };
  }
  if (!isMemberActive(store, userId)) {
    return { ok: false, code: 'MEMBER_REQUIRED', message: 'professional features require active membership' };
  }
  if (capability && session.capabilities.indexOf(capability) === -1) {
    return { ok: false, code: 'DEVICE_CAPABILITY_REQUIRED', message: 'device session capability required' };
  }
  session.lastSeenAt = nowIso();
  return { ok: true, session: session, device: device };
}

function hasDeviceSession(store, req, userId, capability) {
  return resolveDeviceSession(store, req, userId, capability).ok;
}

function refreshDeviceSession(store, req, userId) {
  var resolved = resolveDeviceSession(store, req, userId, '');
  if (!resolved.ok) return resolved;
  resolved.session.revokedAt = nowIso();
  return {
    ok: true,
    data: issueDeviceSession(store, userId, resolved.device, 'refresh')
  };
}

module.exports = {
  ALL_CAPABILITIES,
  CHALLENGE_TTL_MS,
  DEVICE_SESSION_TTL_MS,
  createChallenge,
  findBoundDevice,
  getDeviceSessionToken,
  hasDeviceSession,
  isMemberActive,
  refreshDeviceSession,
  resolveDeviceSession,
  verifyChallengeAndIssue
};
