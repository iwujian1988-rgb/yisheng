const paidUsers = require('../../services/admin/paid-users');

Page({
  data: {
    phone: '',
    expiryDate: '',
    serialNo: '',
    remark: '',
    canSubmit: false,
    submitting: false
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value.trim() }, this.checkCanSubmit);
  },

  onDateChange(e) {
    this.setData({ expiryDate: e.detail.value }, this.checkCanSubmit);
  },

  onSerialInput(e) {
    this.setData({ serialNo: e.detail.value.trim() });
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value });
  },

  checkCanSubmit() {
    this.setData({
      canSubmit: /^1[3-9]\d{9}$/.test(this.data.phone) && this.data.expiryDate.length > 0
    });
  },

  submitCreate() {
    if (!this.data.canSubmit || this.data.submitting) return;

    this.setData({ submitting: true });
    paidUsers.createPaidUser({
      phone: this.data.phone,
      expiryDate: this.data.expiryDate,
      serialNo: this.data.serialNo,
      remark: this.data.remark
    }).then((user) => {
      wx.showToast({ title: '已创建', icon: 'success' });
      wx.redirectTo({ url: '/pages/admin/paid-user-detail?id=' + encodeURIComponent(user.id) });
    }).catch((error) => {
      wx.showToast({ title: error.message || '创建失败', icon: 'none' });
    }).finally(() => {
      this.setData({ submitting: false });
    });
  }
});
