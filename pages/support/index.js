Page({
  contactSupport() {
    wx.showModal({
      title: '联系支持',
      content: '请先提交设备问题或反馈表单，现场人员会根据设备序列号和问题描述处理。',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  reportDeviceIssue() {
    wx.navigateTo({ url: '/pages/support/device-issue' });
  },

  reportAccountIssue() {
    wx.navigateTo({ url: '/pages/feedback/index?type=account' });
  },

  reportTransferIssue() {
    wx.navigateTo({ url: '/pages/transfer/failure-reason' });
  }
});
