const networkTest = require('../../services/diagnostics/network-test');

Page({
  data: {
    loading: false,
    results: []
  },

  startTest() {
    this.setData({ loading: true, results: [] });
    networkTest.runNetworkDiagnostics()
      .then((results) => {
        this.setData({ results });
      })
      .catch((err) => {
        wx.showToast({ title: err.message || '测试失败', icon: 'none' });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  }
});
