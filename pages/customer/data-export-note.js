const milestones = require('../../services/customer/milestones');

const EXPORT_APPLY_KEY = 'customerDataExportApply';

Page({
  data: {
    exportable: [],
    notExportable: []
  },

  onLoad() {
    this.setData(milestones.getDataExportInfo());
  },

  applyExport() {
    wx.setStorageSync(EXPORT_APPLY_KEY, {
      status: 'submitted',
      createdAt: Date.now(),
      exportable: this.data.exportable
    });
    wx.showToast({ title: '已提交申请', icon: 'success' });
  }
});
