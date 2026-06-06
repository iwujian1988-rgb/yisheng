const qaState = require('../../services/qa/check-state');

Page({
  data: {
    passCount: 0,
    failCount: 0,
    total: 0,
    issues: []
  },

  onLoad(options) {
    if (options.passCount || options.failCount) {
      const passCount = parseInt(options.passCount, 10) || 0;
      const failCount = parseInt(options.failCount, 10) || 0;
      this.setData({
        passCount,
        failCount,
        total: passCount + failCount
      });
      return;
    }

    const summary = qaState.getChecklistSummary('smoke', 6);
    this.setData(summary);
  }
});
