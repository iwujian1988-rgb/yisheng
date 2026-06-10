const adminDashboard = require('../../services/admin/dashboard');

Page({
  data: {
    id: '',
    serialNo: '',
    model: '',
    firmwareVersion: '',
    boundUser: '',
    bindStatus: ''
  },

  onLoad(options) {
    const keys = ['id', 'serialNo', 'model', 'firmwareVersion', 'boundUser', 'bindStatus'];
    const data = {};
    keys.forEach((key) => {
      data[key] = options[key] ? decodeURIComponent(options[key]) : '';
    });
    this.setData(data);
  },

  unbindDevice() {
    if (!this.data.id) {
      wx.showToast({ title: '缺少设备 ID', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '确认解绑',
      content: '该操作会解除设备和当前用户的绑定关系。',
      confirmText: '解绑',
      confirmColor: '#F5222D',
      success: (res) => {
        if (!res.confirm) return;
        adminDashboard.forceUnbindDevice(this.data.id, 'admin_request')
          .then(() => {
            wx.showToast({ title: '已解绑', icon: 'success' });
            wx.navigateBack();
          })
          .catch((error) => {
            wx.showToast({ title: error.message || '解绑失败', icon: 'none' });
          });
      }
    });
  },

  disableDevice() {
    wx.showToast({ title: '设备停用需后台权限策略确认', icon: 'none' });
  }
});
