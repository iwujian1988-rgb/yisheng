const authSession = require('../../services/auth/session');

Page({
  data: {
    phone: '',
    code: '',
    password: '',
    confirmPassword: '',
    showPassword: false,
    showConfirmPassword: false,
    agreed: false,
    isLoading: false,
    countingDown: false,
    countdown: 0,
    canSendCode: false,
    canRegister: false,
    phoneError: '',
    codeError: '',
    confirmError: '',
    passwordStrength: 0,
    strengthLevel: '',
    strengthText: ''
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value.trim(), phoneError: '' }, this.checkForm);
  },

  clearPhone() {
    this.setData({ phone: '', phoneError: '' }, this.checkForm);
  },

  onCodeInput(e) {
    this.setData({ code: e.detail.value.trim(), codeError: '' }, this.checkForm);
  },

  onPasswordInput(e) {
    const password = e.detail.value;
    const strength = this.calcStrength(password);
    this.setData({
      password,
      confirmError: '',
      passwordStrength: strength.score,
      strengthLevel: strength.level,
      strengthText: strength.text
    }, this.checkForm);
  },

  onConfirmPasswordInput(e) {
    this.setData({ confirmPassword: e.detail.value, confirmError: '' }, this.checkForm);
  },

  togglePassword() {
    this.setData({ showPassword: !this.data.showPassword });
  },

  toggleConfirmPassword() {
    this.setData({ showConfirmPassword: !this.data.showConfirmPassword });
  },

  calcStrength(password) {
    let score = 0;
    if (password.length >= 6) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password) && /[a-zA-Z]/.test(password)) score++;
    score = Math.min(score, 3);
    const levels = ['', 'weak', 'medium', 'strong'];
    const texts = ['', '弱', '中', '强'];
    return { score, level: levels[score], text: texts[score] };
  },

  validatePhone() {
    if (!this.data.phone) {
      this.setData({ phoneError: '请输入手机号' });
      return false;
    }
    if (!/^1[3-9]\d{9}$/.test(this.data.phone)) {
      this.setData({ phoneError: '手机号格式不正确' });
      return false;
    }
    return true;
  },

  sendCode() {
    if (!this.data.canSendCode || this.data.countingDown) return;
    if (!this.validatePhone()) return;

    authSession.requestRegisterCode(this.data.phone)
      .then(() => {
        this.startCountdown();
        wx.showToast({ title: '验证码已发送', icon: 'success' });
      })
      .catch((err) => {
        wx.showToast({ title: err.message || '验证码发送失败', icon: 'none' });
      });
  },

  startCountdown() {
    this.setData({ countingDown: true, countdown: 60 }, this.checkForm);
    this._timer = setInterval(() => {
      const countdown = this.data.countdown - 1;
      if (countdown <= 0) {
        clearInterval(this._timer);
        this.setData({ countingDown: false, countdown: 0 }, this.checkForm);
        return;
      }
      this.setData({ countdown });
    }, 1000);
  },

  onUnload() {
    if (this._timer) clearInterval(this._timer);
  },

  onAgreementChange(e) {
    this.setData({ agreed: e.detail.value.length > 0 }, this.checkForm);
  },

  checkForm() {
    const canSendCode = /^1[3-9]\d{9}$/.test(this.data.phone);
    const canRegister = Boolean(
      canSendCode &&
      /^\d{6}$/.test(this.data.code) &&
      this.data.password.length >= 6 &&
      this.data.confirmPassword.length >= 6 &&
      this.data.agreed
    );
    this.setData({ canSendCode, canRegister });
  },

  onRegister() {
    if (this.data.isLoading) return;
    if (!this.validatePhone()) return;
    if (!/^\d{6}$/.test(this.data.code)) {
      this.setData({ codeError: '请输入 6 位数字验证码' });
      return;
    }
    if (this.data.password.length < 6 || this.data.password.length > 20) {
      wx.showToast({ title: '密码长度为 6-20 位', icon: 'none' });
      return;
    }
    if (this.data.password !== this.data.confirmPassword) {
      this.setData({ confirmError: '两次输入的密码不一致' });
      return;
    }
    if (!this.data.agreed) {
      wx.showToast({ title: '请先同意协议', icon: 'none' });
      return;
    }

    this.setData({ isLoading: true });
    authSession.registerWithPhone(this.data.phone, this.data.code, this.data.password)
      .then((profile) => {
        const app = typeof getApp === 'function' ? getApp() : null;
        if (app && app.syncSession) app.syncSession(profile);
        this.setData({ isLoading: false });
        wx.reLaunch({ url: '/pages/home/home' });
      })
      .catch((err) => {
        this.setData({ isLoading: false });
        wx.showToast({ title: err.message || '注册失败', icon: 'none' });
      });
  },

  goToLogin() {
    wx.navigateBack({ fail: () => wx.redirectTo({ url: '/pages/login/login' }) });
  },

  goToAgreement(e) {
    const type = e.currentTarget.dataset.type;
    wx.navigateTo({ url: '/pages/common/agreement?type=' + type });
  }
});
