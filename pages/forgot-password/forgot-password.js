// pages/forgot-password/forgot-password.js
const authSession = require('../../services/auth/session');

Page({
  data: {
    step: 1,
    phone: '',
    code: '',
    password: '',
    confirmPassword: '',
    showPassword: false,
    showConfirmPassword: false,
    isLoading: false,
    countingDown: false,
    countdown: 0,
    canSendCode: false,
    canNext: false,
    canReset: false,
    phoneError: '',
    codeError: '',
    confirmError: ''
  },

  onPhoneInput(e) {
    const phone = e.detail.value.trim();
    this.setData({ phone, phoneError: '' }, this.checkStep1);
  },

  clearPhone() {
    this.setData({ phone: '', phoneError: '' }, this.checkStep1);
  },

  onCodeInput(e) {
    this.setData({ code: e.detail.value.trim(), codeError: '' }, this.checkStep1);
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value, confirmError: '' }, this.checkStep2);
  },

  onConfirmPasswordInput(e) {
    this.setData({ confirmPassword: e.detail.value, confirmError: '' }, this.checkStep2);
  },

  togglePassword() {
    this.setData({ showPassword: !this.data.showPassword });
  },

  toggleConfirmPassword() {
    this.setData({ showConfirmPassword: !this.data.showConfirmPassword });
  },

  validatePhone() {
    const { phone } = this.data;
    if (!phone) {
      this.setData({ phoneError: '请输入手机号' });
      return false;
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      this.setData({ phoneError: '手机号格式不正确' });
      return false;
    }
    return true;
  },

  sendCode() {
    if (!this.data.canSendCode || this.data.countingDown) return;
    if (!this.validatePhone()) return;

    authSession.requestResetCode(this.data.phone)
      .then(() => {
        this.startCountdown();
        wx.showToast({ title: '验证码已发送', icon: 'success' });
      })
      .catch((err) => {
        wx.showToast({ title: err.message || '验证码发送失败', icon: 'none' });
      });
  },

  startCountdown() {
    this.setData({ countingDown: true, countdown: 60 });
    this._timer = setInterval(() => {
      const next = this.data.countdown - 1;
      if (next <= 0) {
        clearInterval(this._timer);
        this.setData({ countingDown: false, countdown: 0 });
      } else {
        this.setData({ countdown: next });
      }
    }, 1000);
  },

  onUnload() {
    if (this._timer) clearInterval(this._timer);
  },

  checkStep1() {
    const { phone, code } = this.data;
    const canSendCode = /^1[3-9]\d{9}$/.test(phone);
    const canNext = canSendCode && /^\d{6}$/.test(code);
    this.setData({ canSendCode, canNext });
  },

  checkStep2() {
    const { password, confirmPassword } = this.data;
    const canReset = password.length >= 6 && confirmPassword.length >= 6;
    this.setData({ canReset });
  },

  goToStep2() {
    if (!this.validatePhone()) return;
    if (!/^\d{6}$/.test(this.data.code)) {
      this.setData({ codeError: '请输入6位数字验证码' });
      return;
    }
    this.setData({ step: 2 });
  },

  onResetPassword() {
    const { phone, code, password, confirmPassword, isLoading } = this.data;
    if (isLoading) return;

    if (password.length < 6 || password.length > 20) {
      wx.showToast({ title: '密码长度为6-20位', icon: 'none' });
      return;
    }

    if (password !== confirmPassword) {
      this.setData({ confirmError: '两次输入的密码不一致' });
      return;
    }

    this.setData({ isLoading: true });

    authSession.resetPassword(phone, code, password)
      .then(() => {
        this.setData({ isLoading: false, step: 3 });
      })
      .catch((err) => {
        this.setData({ isLoading: false });
        wx.showToast({ title: err.message || '重置失败', icon: 'none' });
      });
  },

  goToLogin() {
    wx.navigateBack();
  }
});
