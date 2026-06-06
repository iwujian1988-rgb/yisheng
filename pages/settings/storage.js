const localData = require('../../services/storage/local-data');

Page({
  data: {
    historyCount: 0,
    hasDraft: false,
    hasDeviceCache: false
  },

  onLoad() {
    this.refreshSummary();
  },

  refreshSummary() {
    this.setData(localData.getLocalDataSummary());
  },

  clearHistory() {
    wx.showModal({
      title: '确认清除',
      content: '传输历史记录清除后无法恢复。',
      confirmText: '清除',
      confirmColor: '#F5222D',
      success: (res) => {
        if (res.confirm) {
          localData.clearHistory();
          this.refreshSummary();
          wx.showToast({ title: '已清除', icon: 'success' });
        }
      }
    });
  },

  clearDrafts() {
    wx.showModal({
      title: '确认清除',
      content: '本地草稿清除后无法恢复。',
      confirmText: '清除',
      confirmColor: '#F5222D',
      success: (res) => {
        if (res.confirm) {
          localData.clearDrafts();
          this.refreshSummary();
          wx.showToast({ title: '已清除', icon: 'success' });
        }
      }
    });
  },

  clearDeviceCache() {
    wx.showModal({
      title: '确认清除',
      content: '设备缓存清除后，可能需要重新进入设备页面。',
      confirmText: '清除',
      confirmColor: '#F5222D',
      success: (res) => {
        if (res.confirm) {
          localData.clearDeviceCache();
          this.refreshSummary();
          wx.showToast({ title: '已清除', icon: 'success' });
        }
      }
    });
  }
});
