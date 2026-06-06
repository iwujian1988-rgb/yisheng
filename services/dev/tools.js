const authSession = require('../auth/session');
const { TEST_USERS, TEST_VERIFICATION_CODE } = require('./test-data');

function getTestAccountGuide() {
  const users = Object.keys(TEST_USERS).map((key) => {
    const user = TEST_USERS[key];
    return {
      account: user.account,
      password: user.password,
      purchaseStatus: user.purchaseStatus,
      deviceBindingStatus: user.deviceBindingStatus,
      serviceStatus: user.serviceStatus
    };
  });

  return {
    verificationCode: TEST_VERIFICATION_CODE,
    users
  };
}

function getTestStatus() {
  const session = authSession.getStoredSessionSummary();
  return {
    hasToken: Boolean(session.token),
    accountStatus: session.accountStatus || 'none',
    purchaseStatus: session.purchaseStatus || 'none',
    deviceBindingStatus: session.deviceBindingStatus || 'not_bound',
    serviceStatus: session.serviceStatus || 'active',
    hasBoundDevice: Boolean(session.device)
  };
}

function clearTestData() {
  [
    'loginFailCount',
    'loginLockTime',
    'transferHistoryRecords',
    'pendingTransferDraft',
    'purchaseRecords',
    'feedbackSubmissions',
    'supportDeviceIssues',
    'transferSettings',
    'privacySettings',
    'notificationSettings'
  ].forEach((key) => wx.removeStorageSync(key));

  return { code: 'OK' };
}

module.exports = {
  getTestAccountGuide,
  getTestStatus,
  clearTestData
};
