const authSession = require('./session');
const { ACCOUNT_STATUS } = require('../constants/account-status');

function getHomeEntryUrl() {
  const session = authSession.getStoredSessionSummary();

  if (!session.token) {
    return '/pages/login/login';
  }

  if (
    session.accountStatus !== ACCOUNT_STATUS.ACTIVE &&
    session.accountStatus !== ACCOUNT_STATUS.PAID_NOT_BOUND &&
    session.accountStatus !== ACCOUNT_STATUS.DEVICE_CONFLICT
  ) {
    return '/pages/account-status/account-status?accountStatus=' + (session.accountStatus || '');
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
