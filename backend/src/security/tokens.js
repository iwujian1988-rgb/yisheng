const crypto = require('crypto');
const { createId, nowIso } = require('./ids');

function tokenHash(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function createSessionManager(ttlSeconds, store) {
  var sessions = new Map();
  var sessionStore = store && Array.isArray(store.authSessions) ? store.authSessions : null;

  function persist() {
    if (store && typeof store.save === 'function') store.save();
  }

  function activeStoredSession(hash) {
    if (!sessionStore || !hash) return null;
    return sessionStore.find(function (session) {
      return session.tokenHash === hash && !session.revokedAt && new Date(session.expiresAt).getTime() > Date.now();
    }) || null;
  }

  function issueSession(subject) {
    var token = crypto.randomBytes(24).toString('hex');
    var session = {
      subject: subject,
      expiresAt: Date.now() + ttlSeconds * 1000
    };
    sessions.set(token, session);
    if (sessionStore) {
      sessionStore.push({
        id: createId('authsess'),
        tokenHash: tokenHash(token),
        subjectKind: subject.kind || '',
        subjectId: subject.id || '',
        subjectOpenid: subject.openid || '',
        expiresAt: new Date(session.expiresAt).toISOString(),
        revokedAt: '',
        createdAt: nowIso(),
        updatedAt: nowIso()
      });
      persist();
    }
    return token;
  }

  function resolveSession(token) {
    var session = sessions.get(token);
    if (session && Date.now() > session.expiresAt) {
      sessions.delete(token);
      session = null;
    }
    if (session) return session.subject;

    var stored = activeStoredSession(tokenHash(token));
    if (!stored) return null;
    var subject = {
      kind: stored.subjectKind,
      id: stored.subjectId,
      openid: stored.subjectOpenid || ''
    };
    sessions.set(token, {
      subject: subject,
      expiresAt: new Date(stored.expiresAt).getTime()
    });
    return subject;
  }

  function revokeStoredSessions(predicate) {
    if (!sessionStore) return;
    var changed = false;
    sessionStore.forEach(function (session) {
      if (!session.revokedAt && predicate(session)) {
        session.revokedAt = nowIso();
        session.updatedAt = session.revokedAt;
        changed = true;
      }
    });
    if (changed) persist();
  }

  function revokeSession(token) {
    if (!token) return;
    sessions.delete(token);
    var hash = tokenHash(token);
    revokeStoredSessions(function (session) { return session.tokenHash === hash; });
  }

  function revokeByUserId(userId) {
    if (!userId) return;
    sessions.forEach(function (session, key) {
      if (session.subject && session.subject.id === userId) {
        sessions.delete(key);
      }
    });
    revokeStoredSessions(function (session) {
      return session.subjectKind === 'user' && session.subjectId === userId;
    });
  }

  function pruneExpired() {
    if (!sessionStore) return;
    var now = Date.now();
    var changed = false;
    sessionStore.forEach(function (session) {
      if (!session.revokedAt && new Date(session.expiresAt).getTime() <= now) {
        session.revokedAt = nowIso();
        session.updatedAt = session.revokedAt;
        changed = true;
      }
    });
    if (changed) persist();
  }

  return {
    issueSession,
    resolveSession,
    revokeSession,
    revokeByUserId,
    pruneExpired
  };
}

module.exports = {
  createSessionManager
};
