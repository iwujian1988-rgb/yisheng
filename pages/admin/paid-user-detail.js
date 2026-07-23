const paidUsers = require('../../services/admin/paid-users');

Page({
  data: {
    id: '',
    phone: '',
    serviceStatus: '',
    expiryDate: '',
    deviceSerial: '',
    remark: '',
    loading: true
  },

  onLoad(options) {
    const id = options.id ? decodeURIComponent(options.id) : '';
    this.setData({ id });
    this.loadUser(id, options);
  },

  onShow() {
    if (this.data.id) {
      this.loadUser(this.data.id);
    }
  },

  loadUser(id, options) {
    if (!id) {
      if (options) {
        this.setData({
          loading: false,
          phone: options.phone ? decodeURIComponent(options.phone) : '',
          serviceStatus: options.serviceStatus ? decodeURIComponent(options.serviceStatus) : '',
          expiryDate: options.expiryDate ? decodeURIComponent(options.expiryDate) : '',
          deviceSerial: options.deviceSerial ? decodeURIComponent(options.deviceSerial) : ''
        });
      } else {
        this.setData({ loading: false });
      }
      return;
    }

    this.setData({ loading: true });
    paidUsers.getPaidUserById(id)
      .then((user) => {
        if (!user) {
          this.setData({ loading: false });
          return;
        }
        this.setData({
          id: user.id,
          phone: user.phone,
          serviceStatus: user.status,
          expiryDate: user.expiryDate,
          deviceSerial: user.serialNo,
          remark: user.remark,
          loading: false
        });
      })
      .catch(() => {
        this.setData({ loading: false });
      });
  },

  editUser() {
    const id = this.data.id || this.data.phone;
    wx.navigateTo({ url: '/pages/admin/paid-user-edit?id=' + encodeURIComponent(id) });
  },

  renewService() {
    this.editUser();
  },

  disableUser() {
    const id = this.data.id || this.data.phone;
    if (!id) return;
    paidUsers.updatePaidUser(id, { status: 'disabled' })
      .then(() => {
        wx.showToast({ title: '已停用', icon: 'success' });
        this.loadUser(id);
      })
      .catch((err) => {
        wx.showToast({ title: err.message || '操作失败', icon: 'none' });
      });
  }
});
