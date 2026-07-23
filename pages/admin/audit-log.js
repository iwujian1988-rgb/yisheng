const auditLog = require('../../services/admin/audit-log');

Page({
  data: {
    logs: [],
    loading: true
  },

  onLoad() {
    this.refreshLogs();
  },

  onPullDownRefresh() {
    this.refreshLogs(true);
  },

  refreshLogs(stopPullDown) {
    this.setData({ loading: true });
    auditLog.getAuditLogs()
      .then((result) => {
        const list = Array.isArray(result) ? result : (result.list || []);
        this.setData({ logs: list, loading: false });
        if (stopPullDown) wx.stopPullDownRefresh();
      })
      .catch((err) => {
        this.setData({ logs: [], loading: false });
        wx.showToast({ title: err.message || '加载失败', icon: 'none' });
        if (stopPullDown) wx.stopPullDownRefresh();
      });
  }
});
