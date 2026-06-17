const authSession = require('./session');

function getHomeEntryUrl() {
  const session = authSession.getStoredSessionSummary();

  if (!session.token) {
    return '/pages/login/login';
  }

  return '';
}

function requireActiveAccount() {
  const redirectUrl = getHomeEntryUrl();
  if (!redirectUrl) {
    return true;
  }

  wx.redirectTo({
    url: redirectUrl,
    fail() {
      wx.reLaunch({ url: redirectUrl });
    }
  });
  return false;
}

module.exports = {
  getHomeEntryUrl,
  requireActiveAccount
};
