const networkTest = require('../../services/diagnostics/network-test');

Page({
  data: {
    loading: false,
    checks: []
  },

  startCheck() {
    this.setData({ loading: true, checks: [] });
    networkTest.runNetworkDiagnostics()
      .then((results) => {
        this.setData({
          checks: results.map((item) => ({
            id: item.key,
            name: item.name,
            result: item.statusText,
            message: item.message,
            pass: item.status === 'pass',
            warn: item.status === 'warn'
          }))
        });
      })
      .catch((error) => {
        wx.showToast({ title: error.message || '检查失败', icon: 'none' });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  }
});
