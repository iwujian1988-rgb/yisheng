const adminUsers = require('../../services/admin/admin-users');

Page({
  data: {
    id: '',
    account: '',
    password: '',
    role: 'customer_service_admin',
    status: 'active',
    canSave: false,
    saving: false,
    isEdit: false
  },

  onLoad(options) {
    const id = options.id ? decodeURIComponent(options.id) : '';
    if (!id) {
      this.setData({ isEdit: false });
      return;
    }
    this.setData({ id, isEdit: true, loading: true });
    adminUsers.listAdminUsers('')
      .then((list) => list.find((item) => item.id === id))
      .then((item) => {
        if (!item) {
          this.setData({ loading: false });
          return;
        }
        this.setData({
          account: item.account || '',
          role: item.role || 'customer_service_admin',
          status: item.status || 'active',
          loading: false
        }, this.checkCanSave);
      });
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value }, this.checkCanSave);
  },

  onRoleChange(e) {
    this.setData({ role: e.detail.value }, this.checkCanSave);
  },

  onStatusChange(e) {
    this.setData({ status: e.detail.value }, this.checkCanSave);
  },

  checkCanSave() {
    const required = this.data.isEdit
      ? Boolean(this.data.account)
      : Boolean(this.data.account && this.data.password);
    this.setData({ canSave: required });
  },

  save() {
    if (!this.data.canSave || this.data.saving) return;
    this.setData({ saving: true });
    const payload = {
      role: this.data.role,
      status: this.data.status
    };
    if (this.data.password) payload.password = this.data.password;
    const op = this.data.isEdit
      ? adminUsers.updateAdminUser(this.data.id, payload)
      : adminUsers.createAdminUser(Object.assign({ account: this.data.account }, payload));
    op.then(() => {
      wx.showToast({ title: '已保存', icon: 'success' });
      wx.navigateBack();
    }).catch((err) => {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    }).finally(() => {
      this.setData({ saving: false });
    });
  }
});
