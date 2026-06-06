const milestones = require('../../services/customer/milestones');

Page({
  data: {
    exportable: [],
    notExportable: []
  },

  onLoad() {
    this.setData(milestones.getDataExportInfo());
  },

  applyExport() {
    wx.showToast({ title: '等待接入数据服务', icon: 'none' });
  }
});
