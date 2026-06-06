const metrics = require('../../services/metrics/summary');

Page({
  data: {
    callCount: 0,
    redactCount: 0,
    approveCount: 0,
    sendCount: 0
  },

  onLoad() {
    this.setData(metrics.getAiUsage());
  }
});
