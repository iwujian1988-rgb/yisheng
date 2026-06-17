const metrics = require('../../services/metrics/summary');

Page({
  data: {
    totalCount: 0,
    successRate: '0%',
    avgTime: '0s',
    longTextPassRate: '0%'
  },

  onLoad() {
    this.refreshMetrics();
  },

  onShow() {
    this.refreshMetrics();
  },

  refreshMetrics() {
    Promise.all([
      metrics.getTransferPerformance(),
      Promise.resolve(metrics.getLongTextSummary())
    ]).then(([performance, longText]) => {
      this.setData({
        totalCount: longText.totalCount || 0,
        successRate: (longText.passRate || 0) + '%',
        avgTime: (performance.avgTime || 0) + 's',
        longTextPassRate: (longText.passRate || 0) + '%'
      });
    });
  }
});
