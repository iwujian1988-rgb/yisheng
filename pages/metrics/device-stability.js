// pages/metrics/device-stability.js
Page({
  data: { connectRate: 0, disconnectCount: 0, writeFailCount: 0, lastTestTime: '' },
  onLoad: function (options) {
    var data = {};
    if (options.connectRate) { data.connectRate = parseFloat(options.connectRate) || 0; }
    if (options.disconnectCount) { data.disconnectCount = parseInt(options.disconnectCount, 10) || 0; }
    if (options.writeFailCount) { data.writeFailCount = parseInt(options.writeFailCount, 10) || 0; }
    if (options.lastTestTime) { data.lastTestTime = decodeURIComponent(options.lastTestTime); }
    this.setData(data);
  }
});
