const dashboard = require('../../services/admin/dashboard');

Page({
  data: {
    keyword: '',
    devices: []
  },

  onLoad() {
    this.refreshDevices();
  },

  onShow() {
    this.refreshDevices();
  },

  refreshDevices() {
    this.setData({
      devices: dashboard.searchDevices(this.data.keyword)
    });
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value }, this.refreshDevices);
  }
});
