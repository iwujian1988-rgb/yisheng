const metrics = require('../../services/metrics/summary');

Page({
  data: {
    avgTime: 0,
    failCount: 0,
    cancelCount: 0,
    maxChars: 0
  },

  onLoad() {
    metrics.getTransferPerformance().then((summary) => {
      this.setData(summary);
    });
  }
});
