const authSession = require('../../services/auth/session');
const deviceBinding = require('../../services/device/binding');

Page({
  data: {
    status: 'unbound',
    loading: false,
    deviceModel: '',
    deviceSN: '',
    bindTime: '',
    unavailableReason: ''
  },

  onLoad(options) {
    this.applyInitialState(options || {});
  },

  onShow() {
    this.refreshDevice();
  },

  applyInitialState(options) {
    const session = authSession.getStoredSessionSummary();
    const device = session.device || wx.getStorageSync('boundDevice') || {};
    const status = options.status || (device.serialNo ? 'bound' : 'unbound');
    this.setData({
      status,
      deviceModel: options.deviceModel || device.model || '',
      deviceSN: options.deviceSN || device.serialNo || '',
      bindTime: options.bindTime || device.boundAt || '',
      unavailableReason: options.unavailableReason || ''
    });
  },

  refreshDevice() {
    this.setData({ loading: true });
    deviceBinding.getMyDevice()
      .then((device) => {
        const nextDevice = device || {};
        this.setData({
          status: nextDevice.serialNo ? 'bound' : 'unbound',
          deviceModel: nextDevice.model || '',
          deviceSN: nextDevice.serialNo || '',
          bindTime: nextDevice.boundAt || '',
          unavailableReason: ''
        });
      })
      .catch((error) => {
        this.setData({
          status: 'unavailable',
          unavailableReason: error.message || '当前无法读取设备状态'
        });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  connectDevice() {
    wx.reLaunch({ url: '/pages/home/home' });
  },

  unbindDevice() {
    if (!this.data.deviceSN) {
      wx.showToast({ title: '暂无设备记录', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '确认解绑',
      content: '解绑只会清除后台记录，不影响后续通过蓝牙连接设备。',
      confirmText: '解绑',
      confirmColor: '#F5222D',
      success: (res) => {
        if (!res.confirm) return;
        this.setData({ loading: true });
        deviceBinding.unbindDevice(this.data.deviceSN, 'user_request')
          .then(() => {
            wx.showToast({ title: '已解绑', icon: 'success' });
            this.refreshDevice();
          })
          .catch((error) => {
            wx.showToast({ title: error.message || '解绑失败', icon: 'none' });
          })
          .finally(() => {
            this.setData({ loading: false });
          });
      }
    });
  },

  retryConnection() {
    this.refreshDevice();
  },

  contactSupport() {
    wx.navigateTo({ url: '/pages/support/device-issue?serialNo=' + encodeURIComponent(this.data.deviceSN || '') });
  }
});
