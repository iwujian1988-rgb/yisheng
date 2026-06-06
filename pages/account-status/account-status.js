const authSession = require('../../services/auth/session');
const accountStatus = require('../../services/constants/account-status');

Page({
  data: {
    status: 'unpaid',
    expireDate: '',
    deviceSN: ''
  },

  onLoad(options) {
    const session = authSession.getStoredSessionSummary();
    const resolvedStatus = options.accountStatus || this.mapStatus(session);
    this.setData({
      status: this.toPageStatus(resolvedStatus),
      expireDate: options.expireDate || '',
      deviceSN: session.device && session.device.serialNo ? session.device.serialNo : ''
    });
  },

  mapStatus(session) {
    return accountStatus.resolveAccountStatus({
      user: session.user,
      purchaseStatus: session.purchaseStatus,
      deviceBindingStatus: session.deviceBindingStatus,
      serviceStatus: session.serviceStatus
    });
  },

  toPageStatus(status) {
    const map = {};
    map[accountStatus.ACCOUNT_STATUS.REGISTERED_NOT_PAID] = 'unpaid';
    map[accountStatus.ACCOUNT_STATUS.PAID_NOT_BOUND] = 'unbound';
    map[accountStatus.ACCOUNT_STATUS.EXPIRED] = 'expired';
    map[accountStatus.ACCOUNT_STATUS.DEVICE_CONFLICT] = 'conflict';
    map[accountStatus.ACCOUNT_STATUS.DISABLED] = 'disabled';
    map[accountStatus.ACCOUNT_STATUS.ACTIVE] = 'active';
    return map[status] || 'unpaid';
  },

  contactSupport() {
    wx.navigateTo({ url: '/pages/purchase/activate' });
  },

  goToBindDevice() {
    wx.navigateTo({ url: '/pages/device/bind' });
  },

  goToHelp() {
    wx.navigateTo({ url: '/pages/tutorials/connect-guide' });
  },

  goHome() {
    wx.reLaunch({ url: '/pages/home/home' });
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.reLaunch({ url: '/pages/login/login' }) });
  }
});
