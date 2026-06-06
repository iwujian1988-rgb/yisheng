const authSession = require('../../services/auth/session');

Page({
  data: {
    nickName: '',
    nickNameInitial: '',
    phone: ''
  },

  onLoad(options) {
    const session = authSession.getStoredSessionSummary();
    const user = session.user || {};
    const nickName = options.nickName || user.nickname || '用户';
    const phone = options.phone || user.phone || '';

    this.setData({
      nickName,
      nickNameInitial: nickName.charAt(0),
      phone
    });
  },

  goToAccountStatus() {
    const session = authSession.getStoredSessionSummary();
    wx.navigateTo({
      url: `/pages/account-status/account-status?accountStatus=${session.accountStatus || ''}`
    });
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

  goToHelp() {
    wx.navigateTo({ url: '/pages/help/help' });
  },

  logout() {
    wx.showModal({
      title: '确认退出',
      content: '退出后需要重新登录才能使用。',
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
