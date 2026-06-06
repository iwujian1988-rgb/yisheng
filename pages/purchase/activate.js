const activation = require('../../services/purchase/activation');

Page({
  data: {
    code: '',
    codeError: '',
    canSubmit: false,
    isLoading: false
  },

  onCodeInput(e) {
    this.setData({ code: (e.detail.value || '').trim(), codeError: '' }, this.checkForm);
  },

  checkForm() {
    this.setData({ canSubmit: this.data.code.length > 0 });
  },

  submitActivation() {
    if (this.data.isLoading) return;
    if (!this.data.code) {
      this.setData({ codeError: '请输入激活码' });
      return;
    }

    this.setData({ isLoading: true });
    activation.checkActivationCode(this.data.code)
      .then(() => {
        this.setData({ isLoading: false });
        wx.showToast({ title: '开通成功', icon: 'success' });
        wx.redirectTo({ url: '/pages/account-status/account-status?accountStatus=paid_not_bound' });
      })
      .catch((err) => {
        this.setData({
          isLoading: false,
          codeError: err.message || '开通失败'
        });
      });
  }
});
