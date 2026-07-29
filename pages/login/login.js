const authSession = require('../../services/auth/session');
const reviewerMock = require('../../services/dev/reviewer-mock');

Page({
  data: {
    phone: '',
    code: '',
    account: '',
    password: '',
    showPassword: false,
    agreed: true,
    canSendCode: false,
    canPhoneLogin: false,
    canLogin: false,
    isLoading: false,
    isCodeLoading: false,
    isWechatLoading: false,
    countingDown: false,
    countdown: 0,
    showPasswordLogin: false
  },

  onLoad() {
    const session = authSession.getStoredSessionSummary();
    if (session.token) {
      wx.reLaunch({ url: '/pages/home/home' });
    }
    this.checkCanLogin();
  },

  onAccountInput(e) {
    this.setData({ account: (e.detail.value || '').trim() }, this.checkCanLogin);
  },

  onPhoneInput(e) {
    this.setData({ phone: (e.detail.value || '').trim() }, this.checkCanLogin);
  },

  onCodeInput(e) {
    this.setData({ code: (e.detail.value || '').trim() }, this.checkCanLogin);
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
    this.setData({ agreed: Boolean(e.detail.checked) }, this.checkCanLogin);
  },

  onPasswordSuffixClick(e) {
    const trigger = e.detail && e.detail.trigger;
    if (trigger === 'suffix' || trigger === 'suffix-icon') {
      this.togglePassword();
    }
  },

  checkCanLogin() {
    const validPhone = /^1[3-9]\d{9}$/.test(this.data.phone);
    const validCode = /^\d{6}$/.test(this.data.code);
    const canPhoneLogin = Boolean(this.data.agreed && validPhone && validCode);
    const canLogin = Boolean(
      this.data.agreed &&
      this.data.account &&
      this.data.password.length >= 6
    );
    this.setData({
      canSendCode: validPhone,
      canPhoneLogin,
      canLogin
    });
  },

  sendCode() {
    if (!this.data.canSendCode || this.data.countingDown || this.data.isCodeLoading) return;

    this.setData({ isCodeLoading: true });
    authSession.requestRegisterCode(this.data.phone)
      .then(() => {
        this.setData({ isCodeLoading: false });
        this.startCountdown();
        wx.showToast({ title: '验证码已发送', icon: 'success' });
      })
      .catch((err) => {
        this.setData({ isCodeLoading: false });
        wx.showToast({ title: err.message || '验证码发送失败', icon: 'none' });
      });
  },

  startCountdown() {
    if (this._timer) clearInterval(this._timer);
    this.setData({ countingDown: true, countdown: 60 }, this.checkCanLogin);
    this._timer = setInterval(() => {
      const countdown = this.data.countdown - 1;
      if (countdown <= 0) {
        clearInterval(this._timer);
        this._timer = null;
        this.setData({ countingDown: false, countdown: 0 }, this.checkCanLogin);
        return;
      }
      this.setData({ countdown });
    }, 1000);
  },

  onUnload() {
    if (this._timer) clearInterval(this._timer);
  },

  onPhoneLogin() {
    if (!this.data.canPhoneLogin || this.data.isLoading) return;
    if (!this.data.agreed) {
      wx.showToast({ title: '请先同意协议', icon: 'none' });
      return;
    }

    this.setData({ isLoading: true });
    // 手机号验证码为主流程，不阻塞等待 wx.login（开发者工具里常超时且不触发 fail）
    this.submitPhoneCodeLogin('');
  },

  fetchWechatLoginCode(timeoutMs) {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(code || '');
      };
      const timer = setTimeout(() => finish(''), timeoutMs || 3000);
      wx.login({
        success: (res) => finish((res && res.code) || ''),
        fail: () => finish('')
      });
    });
  },

  submitPhoneCodeLogin(wechatCode) {
    authSession.loginWithPhoneCode(this.data.phone, this.data.code, wechatCode || '', null)
      .then((profile) => {
        this.afterLogin(profile);
      })
      .catch((err) => {
        this.setData({ isLoading: false });
        console.error('[login] phone code login failed:', err);
        wx.showToast({
          title: err.message || '登录失败',
          icon: 'none',
          duration: 3000
        });
      });
  },

  onWechatLogin() {
    if (!this.data.agreed) {
      wx.showToast({ title: '请先同意协议', icon: 'none' });
      return;
    }
    if (this.data.isWechatLoading) return;

    this.setData({ isWechatLoading: true });
    this.fetchWechatLoginCode(5000)
      .then((wechatCode) => {
        if (!wechatCode) {
          this.setData({ isWechatLoading: false });
          wx.showToast({ title: '微信登录超时，请重试', icon: 'none' });
          return null;
        }
        return authSession.loginWithWechat(wechatCode, null);
      })
      .then((profile) => {
        if (!profile) return;
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
    if (reviewerMock.isReviewerAccount()) {
      reviewerMock.setupReviewerMock();
    }
    this.setData({
      isLoading: false,
      isWechatLoading: false
    });
    this.routeAfterLogin(profile);
  },

  routeAfterLogin() {
    wx.reLaunch({ url: '/pages/home/home' });
  },

  goToAgreement(e) {
    const type = e.currentTarget.dataset.type;
    wx.navigateTo({ url: '/pages/common/agreement?type=' + type });
  }
});
