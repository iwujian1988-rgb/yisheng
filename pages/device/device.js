const authSession = require('../../services/auth/session');

Page({
  data: {
    // unbound | bound | unavailable — 由外部通过 onLoad 传入
    status: 'unbound',
    binding: false,
    deviceModel: '',
    deviceSN: '',
    bindTime: '',
    unavailableReason: ''
  },

  onLoad(options) {
    const session = authSession.getStoredSessionSummary();
    const device = session.device || {};
    const status = options.status || (device.serialNo ? 'bound' : 'unbound');

    this.setData({
      status,
      deviceModel: options.deviceModel || device.model || '',
      deviceSN: options.deviceSN || device.serialNo || '',
      bindTime: options.bindTime || '',
      unavailableReason: options.unavailableReason || ''
    });
  },

  bindDevice() {
    wx.showToast({ title: '等待接入设备绑定服务', icon: 'none' });
  },

  unbindDevice() {
    wx.showModal({
      title: '确认解绑',
      content: '解绑后需要重新绑定才能继续使用传输功能',
      confirmText: '解绑',
      confirmColor: '#F5222D',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '等待接入设备绑定服务', icon: 'none' });
        }
      }
    });
  },

  retryConnection() {
    wx.showToast({ title: '等待接入设备绑定服务', icon: 'none' });
  },

  contactSupport() {
    wx.showToast({ title: '客服功能开发中', icon: 'none' });
  }
});
