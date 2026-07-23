const tokenUsage = require('../../services/admin/token-usage');

Page({
  data: {
    items: [],
    isLoading: false,
    stats: {
      total: 0,
      totalTokens: 0,
      byProvider: {}
    }
  },

  onLoad() {
    this.refresh();
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    this.setData({ isLoading: true });
    tokenUsage.listTokenUsage()
      .then((items) => {
        const totalTokens = items.reduce((sum, item) => sum + Number(item.totalTokens || item.tokens || 0), 0);
        const byProvider = {};
        items.forEach((item) => {
          const key = item.provider || 'unknown';
          byProvider[key] = (byProvider[key] || 0) + Number(item.totalTokens || item.tokens || 0);
        });
        this.setData({
          items: items.slice(0, 200),
          stats: { total: items.length, totalTokens, byProvider },
          isLoading: false
        });
      })
      .catch((err) => {
        this.setData({ items: [], isLoading: false });
        wx.showToast({ title: err.message || '加载失败', icon: 'none' });
      });
  }
});
