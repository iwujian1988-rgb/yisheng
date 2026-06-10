const authSession = require('../../services/auth/session');
const customerService = require('../../services/support/customer-service');

function maskPhone(phone) {
  const value = String(phone || '');
  if (value.length < 7) return value;
  return value.slice(0, 3) + '****' + value.slice(-4);
}

Page({
  data: {
    nickName: '',
    nickNameInitial: '',
    phone: '',
    planTitle: '未开通套餐',
    planDesc: '开通后可使用 AI、OCR、ASR 和场景模板。',
    planActionText: '联系客服开通'
  },

  onShow() {
    this.loadProfile();
  },

  loadProfile() {
    const session = authSession.getStoredSessionSummary();
    const user = session.user || {};
    const nickName = user.nickname || '用户';
    const paid = session.purchaseStatus === 'paid' || session.serviceStatus === 'active';
    this.setData({
      nickName,
      nickNameInitial: nickName.charAt(0),
      phone: maskPhone(user.phone || session.phone || ''),
      planTitle: paid ? '专业会员' : '未开通套餐',
      planDesc: paid ? '已开通会员能力，请连接设备后使用。' : '开通后可使用 AI、OCR、ASR 和场景模板。',
      planActionText: paid ? '查看套餐' : '联系客服开通'
    });
  },

  goToAccountStatus() {
    const session = authSession.getStoredSessionSummary();
    wx.navigateTo({
      url: '/pages/account-status/account-status?accountStatus=' + (session.accountStatus || '')
    });
  },

  goToPurchaseRecords() {
    wx.navigateTo({ url: '/pages/purchase/records' });
  },

  goToDevice() {
    wx.navigateTo({ url: '/pages/device/device' });
  },

  goToSettings() {
    wx.navigateTo({ url: '/pages/settings/transfer' });
  },

  goToHistory() {
    wx.navigateTo({ url: '/pages/history/history' });
  },

  goToDebug() {
    wx.navigateTo({ url: '/pages/dev/index' });
  },

  goToAgreement() {
    wx.navigateTo({ url: '/pages/common/agreement' });
  },

  contactCustomerService() {
    customerService.openCustomerService({
      title: '咨询开通服务',
      path: '/pages/profile/profile'
    });
  },

  logout() {
    wx.showModal({
      title: '确认退出',
      content: '退出后需要重新登录。',
      confirmText: '退出',
      confirmColor: '#F5222D',
      success: (res) => {
        if (res.confirm) {
          authSession.clearSession();
          wx.reLaunch({ url: '/pages/login/login' });
        }
      }
    });
  }
});
