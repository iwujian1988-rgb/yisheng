const metrics = require('../../services/metrics/summary');

Page({
  data: {
    target: metrics.LONG_TEXT_TARGET,
    passRate: 0,
    totalCount: 0,
    records: []
  },

  onLoad() {
    this.setData(metrics.getLongTextSummary());
  },

  onShow() {
    this.setData(metrics.getLongTextSummary());
  }
});
