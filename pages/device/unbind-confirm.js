const deviceBinding = require('../../services/device/binding');

Page({
  data: {
    serialNo: '',
    deviceId: '',
    reasons: [
      { value: 'device_lost', label: '设备丢失' },
      { value: 'device_faulty', label: '设备故障' },
      { value: 'change_device', label: '更换设备' },
      { value: 'stop_using', label: '停止使用' },
      { value: 'other', label: '其他' }
    ],
    selectedReason: '',
    submitting: false
  },

  onLoad(options) {
    this.setData({
      serialNo: options.serialNo ? decodeURIComponent(options.serialNo) : '',
      deviceId: options.deviceId ? decodeURIComponent(options.deviceId) : ''
    });
  },

  onReasonChange(e) {
    this.setData({ selectedReason: e.detail.value });
  },

  confirmUnbind() {
    if (!this.data.selectedReason || this.data.submitting) {
      return;
    }

    this.setData({ submitting: true });
    deviceBinding.unbindDevice(this.data.deviceId || this.data.serialNo, this.data.selectedReason)
      .then(() => {
        wx.showToast({ title: '已解绑', icon: 'success' });
        wx.redirectTo({ url: '/pages/device/device' });
      })
      .catch((error) => {
        wx.showToast({ title: error.message || '解绑失败', icon: 'none' });
      })
      .finally(() => {
        this.setData({ submitting: false });
      });
  }
});
