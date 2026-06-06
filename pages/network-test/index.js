const networkTest = require('../../services/diagnostics/network-test');

Page({
  data: {
    results: []
  },

  startTest() {
    networkTest.runNetworkDiagnostics()
      .then((results) => {
        this.setData({ results });
      })
      .catch((err) => {
        wx.showToast({ title: err.message || '测试失败', icon: 'none' });
      });
  }
});
