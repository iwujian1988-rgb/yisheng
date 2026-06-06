Page({
  data: {
    serialNo: '',
    model: '',
    firmwareVersion: '',
    boundUser: '',
    bindStatus: ''
  },

  onLoad(options) {
    const keys = ['serialNo', 'model', 'firmwareVersion', 'boundUser', 'bindStatus'];
    const data = {};
    keys.forEach((key) => {
      data[key] = options[key] ? decodeURIComponent(options[key]) : '';
    });
    this.setData(data);
  },

  unbindDevice() {
    wx.navigateTo({
      url: '/pages/device/unbind-confirm?serialNo=' + encodeURIComponent(this.data.serialNo)
    });
  },

  disableDevice() {
    wx.showToast({ title: '等待接入正式设备停用服务', icon: 'none' });
  }
});
