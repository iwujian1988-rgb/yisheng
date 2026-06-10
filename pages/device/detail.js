const authSession = require('../../services/auth/session');
const deviceBinding = require('../../services/device/binding');

Page({
  data: {
    model: '',
    serialNo: '',
    bindStatus: '',
    bindStatusText: '',
    firmwareVersion: ''
  },

  onLoad(options) {
    const session = authSession.getStoredSessionSummary();
    const device = session.device || {};
    this.setData({
      model: options.model || device.model || '',
      serialNo: options.serialNo || device.serialNo || '',
      bindStatus: options.bindStatus || (device.serialNo ? 'bound' : 'unbound'),
      bindStatusText: options.bindStatusText || (device.serialNo ? '已绑定' : '未绑定'),
      firmwareVersion: options.firmwareVersion || device.firmwareVersion || ''
    });
  },

  unbindDevice() {
    wx.showModal({
      title: '确认解绑',
      content: '解绑后需要重新绑定，才能继续使用传输功能。',
      confirmText: '解绑',
      confirmColor: '#F5222D',
      success: (res) => {
        if (!res.confirm) return;
        deviceBinding.unbindDevice(this.data.serialNo, 'user_request')
          .then(() => {
            wx.showToast({ title: '已解绑', icon: 'success' });
            wx.redirectTo({ url: '/pages/device/device' });
          })
          .catch((error) => {
            wx.showToast({ title: error.message || '解绑失败', icon: 'none' });
          });
      }
    });
  }
});
