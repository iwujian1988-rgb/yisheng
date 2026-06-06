const TEST_VERIFICATION_CODE = '123456';

const dynamicUsers = {};

const TEST_USERS = {
  activeUser: {
    account: '13800000001',
    password: 'Test123456',
    phone: '13800000001',
    nickname: '测试用户-可用',
    purchaseStatus: 'paid',
    deviceBindingStatus: 'bound',
    serviceStatus: 'active',
    device: {
      id: 'dev_test_001',
      serialNo: 'BL-TEST-0001',
      model: 'V3.0.0-VMode'
    }
  },
  unpaidUser: {
    account: '13800000002',
    password: 'Test123456',
    phone: '13800000002',
    nickname: '测试用户-未开通',
    purchaseStatus: 'none',
    deviceBindingStatus: 'not_bound',
    serviceStatus: 'active',
    device: null
  },
  unboundUser: {
    account: '13800000003',
    password: 'Test123456',
    phone: '13800000003',
    nickname: '测试用户-未绑定',
    purchaseStatus: 'paid',
    deviceBindingStatus: 'not_bound',
    serviceStatus: 'active',
    device: null
  }
};

function createTestUserFromPhone(phone) {
  const user = dynamicUsers[phone] || {
    account: phone,
    password: 'Test123456',
    phone,
    nickname: '测试用户-' + phone.slice(-4),
    purchaseStatus: 'none',
    deviceBindingStatus: 'not_bound',
    serviceStatus: 'active',
    device: null
  };
  dynamicUsers[phone] = user;
  return user;
}

function getTestUserByAccount(account) {
  const preset = Object.keys(TEST_USERS)
    .map((key) => TEST_USERS[key])
    .find((user) => user.account === account || user.phone === account);
  return preset || dynamicUsers[account] || null;
}

module.exports = {
  TEST_VERIFICATION_CODE,
  TEST_USERS,
  createTestUserFromPhone,
  getTestUserByAccount
};
