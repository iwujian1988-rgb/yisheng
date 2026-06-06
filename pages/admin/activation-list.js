const activationCodes = require('../../services/admin/activation-codes');

Page({
  data: {
    filter: 'all',
    codes: [],
    isLoading: false
  },

  onLoad() {
    this.refreshCodes();
  },

  onShow() {
    this.refreshCodes();
  },

  setFilter(e) {
    this.setData({ filter: e.currentTarget.dataset.filter }, this.refreshCodes);
  },

  refreshCodes() {
    this.setData({ isLoading: true });
    activationCodes.filterActivationCodes(this.data.filter)
      .then((codes) => {
        this.setData({ codes, isLoading: false });
      })
      .catch((err) => {
        this.setData({ codes: [], isLoading: false });
        wx.showToast({ title: err.message || '激活码读取失败', icon: 'none' });
      });
  },

  goImport() {
    wx.navigateTo({ url: '/pages/admin/activation-import' });
  }
});
