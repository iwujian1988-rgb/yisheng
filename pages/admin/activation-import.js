const activationCodes = require('../../services/admin/activation-codes');

Page({
  data: {
    codes: '',
    lineCount: 0,
    canSubmit: false,
    submitting: false
  },

  onInput(e) {
    const codes = e.detail.value;
    const lineCount = codes.split('\n').filter((line) => line.trim().length > 0).length;
    this.setData({ codes, lineCount, canSubmit: lineCount > 0 });
  },

  submitImport() {
    if (!this.data.canSubmit || this.data.submitting) return;

    this.setData({ submitting: true });
    activationCodes.importActivationCodes(this.data.codes)
      .then((result) => {
        wx.showToast({
          title: '导入 ' + result.createdCount + ' 个',
          icon: 'success'
        });
        wx.redirectTo({ url: '/pages/admin/activation-list' });
      })
      .catch((err) => {
        wx.showToast({ title: err.message || '导入失败', icon: 'none' });
      })
      .finally(() => {
        this.setData({ submitting: false });
      });
  }
});
