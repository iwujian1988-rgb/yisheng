const deviceBinding = require('../../services/device/binding');

Page({
  data: {
    firmwareVersion: '',
    protocolVersion: '',
    upgradeStatus: ''
  },

  onLoad(options) {
    this.setData({
      firmwareVersion: options.firmwareVersion ? decodeURIComponent(options.firmwareVersion) : '',
      protocolVersion: options.protocolVersion ? decodeURIComponent(options.protocolVersion) : '',
      upgradeStatus: options.upgradeStatus ? decodeURIComponent(options.upgradeStatus) : ''
    });
    this.loadDeviceFallback();
  },

  loadDeviceFallback() {
    deviceBinding.getMyDevice().then((device) => {
      if (!device) {
        return;
      }
      this.setData({
        firmwareVersion: this.data.firmwareVersion || device.firmwareVersion || '',
        protocolVersion: this.data.protocolVersion || device.protocolVersion || '',
        upgradeStatus: this.data.upgradeStatus || '当前无可用更新'
      });
    });
  },

  checkUpdate() {
    wx.showToast({ title: '当前无可用更新', icon: 'none' });
  }
});
