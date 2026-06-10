const historyRecords = require('../../services/history/records');

Page({
  data: {
    records: [],
    isLoading: false
  },

  onLoad() {
    this.refreshRecords();
  },

  onShow() {
    this.refreshRecords();
  },

  refreshRecords() {
    this.setData({ isLoading: true });
    historyRecords.getHistoryRecords()
      .then((records) => {
        this.setData({ records, isLoading: false });
      })
      .catch((err) => {
        this.setData({ isLoading: false });
        wx.showToast({ title: err.message || '历史记录读取失败', icon: 'none' });
      });
  },

  openRecord(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: '/pages/history/detail?id=' + encodeURIComponent(id) });
  }
});
