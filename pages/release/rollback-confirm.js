Page({
  data: {},

  confirmRollback() {
    wx.setStorageSync('releaseRollbackRequest', {
      status: 'submitted',
      createdAt: Date.now()
    });
    wx.showModal({
      title: '已登记回滚申请',
      content: '请在管理后台或发布记录中继续处理版本回滚。',
      showCancel: false
    });
  },

  goBack() {
    wx.navigateBack();
  }
});
