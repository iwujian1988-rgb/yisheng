const paidUsers = require('../../services/admin/paid-users');

Page({
  data: {
    id: '',
    expiryDate: '',
    serviceStatus: 'active',
    remark: '',
    canSave: false,
    saving: false,
    loading: true
  },

  onLoad(options) {
    const id = options.id ? decodeURIComponent(options.id) : '';
    this.setData({ id });

    if (!id) {
      this.setData({
        loading: false,
        expiryDate: options.expiryDate ? decodeURIComponent(options.expiryDate) : '',
        serviceStatus: options.serviceStatus ? decodeURIComponent(options.serviceStatus) : 'active'
      }, this.checkCanSave);
      return;
    }

    paidUsers.getPaidUserById(id)
      .then((user) => {
        this.setData({
          loading: false,
          expiryDate: user ? user.expiryDate : (options.expiryDate ? decodeURIComponent(options.expiryDate) : ''),
          serviceStatus: user ? user.status : (options.serviceStatus ? decodeURIComponent(options.serviceStatus) : 'active'),
          remark: user ? user.remark : ''
        }, this.checkCanSave);
      })
      .catch(() => {
        this.setData({ loading: false });
      });
  },

  onDateChange(e) {
    this.setData({ expiryDate: e.detail.value }, this.checkCanSave);
  },

  onStatusChange(e) {
    this.setData({ serviceStatus: e.detail.value }, this.checkCanSave);
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value });
  },

  checkCanSave() {
    this.setData({
      canSave: Boolean(this.data.id && this.data.expiryDate && this.data.serviceStatus)
    });
  },

  saveUser() {
    if (!this.data.canSave || this.data.saving) return;

    this.setData({ saving: true });
    paidUsers.updatePaidUser(this.data.id, {
      expiryDate: this.data.expiryDate,
      status: this.data.serviceStatus,
      remark: this.data.remark
    }).then(() => {
      wx.showToast({ title: '已保存', icon: 'success' });
      wx.navigateBack({ delta: 1 });
    }).catch((err) => {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    }).finally(() => {
      this.setData({ saving: false });
    });
  }
});
