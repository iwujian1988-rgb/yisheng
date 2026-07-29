var REVIEWER_PHONES = ['13800000001'];
var MOCK_DEVICE_ID = 'mock-review-device-001';
var MOCK_DEVICE_NAME = '演示设备（审核专用）';

function getAppGlobalData() {
  var app = typeof getApp === 'function' ? getApp() : null;
  return (app && app.globalData) || null;
}

function getCurrentUserPhone() {
  try {
    var userInfo = wx.getStorageSync('userInfo') || {};
    return userInfo.phone || '';
  } catch (e) {
    return '';
  }
}

function isReviewerAccount() {
  return REVIEWER_PHONES.indexOf(getCurrentUserPhone()) !== -1;
}

function setupReviewerMock() {
  if (!isReviewerAccount()) return false;
  var gd = getAppGlobalData();
  if (!gd) return false;
  gd.bleLinkReady = true;
  gd.bleDeviceId = MOCK_DEVICE_ID;
  gd.bleDeviceName = MOCK_DEVICE_NAME;
  gd.deviceConnected = true;
  gd.isReviewerMock = true;
  // 预置付费状态：isPaidMember() 和首页 isMember 都读 wx.getStorageSync('purchaseStatus')，
  // 设一处两处都通。仅对审核测试账号生效；登录时在 syncSession 之后执行，覆盖后端未付费状态。
  try { wx.setStorageSync('purchaseStatus', 'paid'); } catch (e) {}
  return true;
}

function isMockBleMode() {
  var gd = getAppGlobalData();
  return Boolean(gd && gd.isReviewerMock && gd.bleDeviceId === MOCK_DEVICE_ID);
}

function teardownReviewerMock() {
  var gd = getAppGlobalData();
  if (!gd) return;
  gd.bleLinkReady = false;
  gd.bleDeviceId = '';
  gd.bleDeviceName = '';
  gd.deviceConnected = false;
  gd.isReviewerMock = false;
  try { wx.removeStorageSync('purchaseStatus'); } catch (e) {}
}

module.exports = {
  REVIEWER_PHONES: REVIEWER_PHONES,
  MOCK_DEVICE_ID: MOCK_DEVICE_ID,
  MOCK_DEVICE_NAME: MOCK_DEVICE_NAME,
  isReviewerAccount: isReviewerAccount,
  setupReviewerMock: setupReviewerMock,
  isMockBleMode: isMockBleMode,
  teardownReviewerMock: teardownReviewerMock
};
