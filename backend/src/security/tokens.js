const crypto = require('crypto');

function createSessionManager(ttlSeconds) {
  var sessions = new Map();

  function issueSession(subject) {
    var token = crypto.randomBytes(24).toString('hex');
    sessions.set(token, {
      subject: subject,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
    return token;
  }

  function resolveSession(token) {
    var session = sessions.get(token);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      sessions.delete(token);
      return null;
    }
    return session.subject;
  }

  function revokeByUserId(userId) {
    if (!userId) return;
    sessions.forEach(function (session, key) {
      if (session.subject && session.subject.id === userId) {
        sessions.delete(key);
      }
    });
  }

  return {
    issueSession,
    resolveSession,
    revokeByUserId
  };
}

module.exports = {
  createSessionManager
};
