const historyRecords = require('../../services/history/records');
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
      historyRecords.getHistoryRecords(),
      metrics.getTransferPerformance()
    ]).then(([records, performance]) => {
      const successCount = records.filter((record) => record.status !== 'failed').length;
      const successRate = records.length ? Math.round((successCount / records.length) * 100) : 0;
      const longText = metrics.getLongTextSummary();
      this.setData({
        totalCount: records.length,
        successRate: successRate + '%',
        avgTime: (performance.avgTime || 0) + 's',
        longTextPassRate: (longText.passRate || 0) + '%'
      });
    });
  }
});
