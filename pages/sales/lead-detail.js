// pages/sales/lead-detail.js
Page({
  data: { customerName: '', demand: '', followStatus: '', remark: '' },
  onLoad: function (options) {
    var keys = ['customerName', 'demand', 'followStatus', 'remark'];
    var data = {};
    for (var i = 0; i < keys.length; i++) {
      if (options[keys[i]]) { data[keys[i]] = decodeURIComponent(options[keys[i]]); }
    }
    this.setData(data);
  }
});
