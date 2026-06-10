const historyRecords = require('../../services/history/records');

Page({
  data: {
    id: '',
    type: '',
    time: '',
    textLength: 0,
    text: '',
    isLoading: false
  },

  onLoad(options) {
    const id = options && options.id ? decodeURIComponent(options.id) : '';
    this.setData({ id });
    if (id) this.loadDetail(id);
  },

  loadDetail(id) {
    this.setData({ isLoading: true });
    historyRecords.getHistoryDetail(id)
      .then((detail) => {
        this.setData({
          type: detail.type || '文本',
          time: detail.time || '',
          textLength: detail.textLength || 0,
          text: detail.text || '',
          isLoading: false
        });
      })
      .catch((error) => {
        this.setData({ isLoading: false });
        wx.showToast({ title: error.message || '读取失败', icon: 'none' });
      });
  },

  copyText() {
    if (!this.data.text) return;
    wx.setClipboardData({
      data: this.data.text,
      success: () => wx.showToast({ title: '已复制', icon: 'success' })
    });
  }
});
