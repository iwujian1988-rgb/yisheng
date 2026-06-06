const authSession = require('../../services/auth/session');
const { ACCOUNT_STATUS } = require('../../services/constants/account-status');

Page({
  data: {
    account: '',
    password: '',
    showPassword: false,
    agreed: true,
    canLogin: false,
    isLoading: false,
    isWechatLoading: false,
    showPasswordLogin: false
  },

  onLoad() {
    const session = authSession.getStoredSessionSummary();
    if (session.token && session.accountStatus === ACCOUNT_STATUS.ACTIVE) {
      wx.reLaunch({ url: '/pages/home/home' });
    }
  },

  onAccountInput(e) {
    this.setData({ account: (e.detail.value || '').trim() }, this.checkCanLogin);
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value || '' }, this.checkCanLogin);
  },

  togglePassword() {
    this.setData({ showPassword: !this.data.showPassword });
  },

  togglePasswordLogin() {
    this.setData({ showPasswordLogin: !this.data.showPasswordLogin });
  },

  onAgreementChange(e) {
    this.setData({ agreed: e.detail.value.length > 0 }, this.checkCanLogin);
  },

  checkCanLogin() {
    const canLogin = Boolean(
      this.data.agreed &&
      this.data.account &&
      this.data.password.length >= 6
    );
    this.setData({ canLogin });
  },

  onWechatLogin() {
    if (!this.data.agreed) {
      wx.showToast({ title: '请先同意协议', icon: 'none' });
      return;
    }
    if (this.data.isWechatLoading) return;

    this.setData({ isWechatLoading: true });
    wx.login({
      success: (res) => {
        if (!res.code) {
          this.setData({ isWechatLoading: false });
          wx.showToast({ title: '微信登录失败', icon: 'none' });
          return;
        }
        authSession.loginWithWechat(res.code, null)
          .then((profile) => {
            this.afterLogin(profile);
          })
          .catch((err) => {
            this.setData({ isWechatLoading: false });
            wx.showToast({
              title: err.message || '微信登录失败',
              icon: 'none'
            });
          });
      },
      fail: () => {
        this.setData({ isWechatLoading: false });
        wx.showToast({ title: '微信登录失败', icon: 'none' });
      }
    });
  },

  onLogin() {
    if (!this.data.canLogin || this.data.isLoading) return;

    this.setData({ isLoading: true });
    authSession.loginWithPassword(this.data.account, this.data.password)
      .then((profile) => {
        this.afterLogin(profile);
      })
      .catch((err) => {
        this.setData({ isLoading: false });
        wx.showToast({
          title: err.message || '登录失败',
          icon: 'none'
        });
      });
  },

  afterLogin(profile) {
    const app = typeof getApp === 'function' ? getApp() : null;
    if (app && app.syncSession) {
      app.syncSession(profile);
    }
    this.setData({
      isLoading: false,
      isWechatLoading: false
    });
    this.routeAfterLogin(profile);
  },

  routeAfterLogin(profile) {
    if (profile.accountStatus === ACCOUNT_STATUS.ACTIVE) {
      wx.reLaunch({ url: '/pages/home/home' });
      return;
    }

    wx.redirectTo({
      url: '/pages/account-status/account-status?accountStatus=' + profile.accountStatus
    });
  },

  goToAgreement(e) {
    const type = e.currentTarget.dataset.type;
    wx.navigateTo({ url: '/pages/common/agreement?type=' + type });
  }
});
