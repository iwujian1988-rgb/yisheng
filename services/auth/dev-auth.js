const {
  TEST_VERIFICATION_CODE,
  createTestUserFromPhone,
  getTestUserByAccount
} = require('../dev/test-data');

function toSessionPayload(testUser) {
  return {
    token: 'dev-token-' + testUser.phone,
    user: {
      id: 'dev-user-' + testUser.phone,
      phone: testUser.phone,
      nickname: testUser.nickname,
      disabled: false,
      memberStatus: testUser.memberStatus || (testUser.purchaseStatus === 'paid' ? 'active' : 'none'),
      memberEnd: testUser.memberEnd || ''
    },
    purchaseStatus: testUser.purchaseStatus,
    deviceBindingStatus: testUser.deviceBindingStatus,
    serviceStatus: testUser.serviceStatus,
    device: testUser.device
  };
}

function requestRegisterCode(phone) {
  return Promise.resolve({
    code: 'OK',
    data: {
      phone,
      verificationCode: TEST_VERIFICATION_CODE,
      expiresIn: 300
    }
  });
}

function registerWithPhone(phone, code, password) {
  if (code !== TEST_VERIFICATION_CODE) {
    return Promise.reject({
      code: 'INVALID_VERIFICATION_CODE',
      message: '验证码错误'
    });
  }

  const testUser = createTestUserFromPhone(phone);
  testUser.password = password;
  return Promise.resolve({
    code: 'OK',
    data: toSessionPayload(testUser)
  });
}

function loginWithPhoneCode(phone, code, wechatCode, userInfo) {
  if (code !== TEST_VERIFICATION_CODE) {
    return Promise.reject({
      code: 'INVALID_VERIFICATION_CODE',
      message: '验证码错误'
    });
  }

  const testUser = createTestUserFromPhone(phone);
  if (wechatCode && !testUser.openid) {
    testUser.openid = 'dev-openid-' + wechatCode;
  }
  if (userInfo && userInfo.nickName && !testUser.nickname) {
    testUser.nickname = userInfo.nickName;
  }
  return Promise.resolve({
    code: 'OK',
    data: toSessionPayload(testUser)
  });
}

function loginWithPassword(account, password) {
  const testUser = getTestUserByAccount(account);
  if (!testUser || testUser.password !== password) {
    return Promise.reject({
      code: 'INVALID_CREDENTIALS',
      message: '账号或密码错误'
    });
  }

  return Promise.resolve({
    code: 'OK',
    data: toSessionPayload(testUser)
  });
}

function loginWithWechat(code, userInfo) {
  const openid = 'dev-openid-' + (code || 'local');
  const testUser = Object.keys(require('../dev/test-data').TEST_USERS)
    .map((key) => require('../dev/test-data').TEST_USERS[key])
    .find((user) => user.openid === openid);
  if (!testUser) {
    return Promise.reject({
      code: 'WECHAT_NOT_BOUND',
      message: '微信未绑定账号，请用手机号验证码登录'
    });
  }
  return Promise.resolve({
    code: 'OK',
    data: toSessionPayload(testUser)
  });
}

module.exports = {
  requestRegisterCode,
  loginWithPhoneCode,
  registerWithPhone,
  loginWithPassword,
  loginWithWechat
};
