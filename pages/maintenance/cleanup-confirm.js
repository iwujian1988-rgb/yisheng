Page({
  data: { cacheSize: '0KB', tempSize: '0KB', logCount: '0' },

  confirmCleanup() {
    [
      'templateResultDraft',
      'ocrLatestResult',
      'asrLatestResult',
      'customerDataExportApply'
    ].forEach((key) => wx.removeStorageSync(key));
    wx.showToast({ title: '已清理', icon: 'success' });
  },

  goBack() {
    wx.navigateBack();
  }
});
