const dashboard = require('../../services/admin/dashboard');

Page({
  data: {
    totalDevices: 0,
    boundDevices: 0,
    abnormalDevices: 0,
    pendingDevices: 0
  },

  onLoad() {
    this.refreshMetrics();
  },

  onShow() {
    this.refreshMetrics();
  },

  refreshMetrics() {
    const devices = dashboard.getDevices();
    this.setData({
      totalDevices: devices.length,
      boundDevices: devices.filter((device) => device.status === 'bound').length,
      abnormalDevices: devices.filter((device) => device.status === 'abnormal').length,
      pendingDevices: devices.filter((device) => device.status === 'pending').length
    });
  }
});
