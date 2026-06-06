const metrics = require('../../services/metrics/summary');

Page({
  data: {
    ocrCount: 0,
    asrCount: 0,
    confirmCount: 0,
    discardCount: 0
  },

  onLoad() {
    this.setData(metrics.getOcrAsrUsage());
  }
});
