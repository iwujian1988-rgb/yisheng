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
      disabled: false
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

function requestResetCode(phone) {
  return Promise.resolve({
    code: 'OK',
    data: {
      phone,
      verificationCode: TEST_VERIFICATION_CODE,
      expiresIn: 300
    }
  });
}

function resetPassword(phone, code, password) {
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
    data: {
      phone,
      passwordUpdated: Boolean(password)
    }
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
  return Promise.resolve({
    code: 'OK',
    data: {
      token: 'dev-wechat-token-' + (code || 'local'),
      user: {
        id: 'dev-wechat-user',
        openid: 'dev-openid-' + (code || 'local'),
        nickname: (userInfo && userInfo.nickName) || '微信用户',
        disabled: false
      },
      purchaseStatus: 'none',
      deviceBindingStatus: 'not_bound',
      serviceStatus: 'none',
      device: null
    }
  });
}

module.exports = {
  requestRegisterCode,
  registerWithPhone,
  requestResetCode,
  resetPassword,
  loginWithPassword,
  loginWithWechat
};
