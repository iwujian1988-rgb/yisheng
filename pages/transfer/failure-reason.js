const failureReport = require('../../services/transfer/failure-report');

Page({
  data: {
    reasons: [
      { value: 'device_disconnected', label: '设备未连接' },
      { value: 'not_focused', label: '电脑未聚焦' },
      { value: 'text_too_long', label: '文本过长' },
      { value: 'interrupted', label: '传输中断' },
      { value: 'other', label: '其他' }
    ],
    selectedReason: '',
    description: '',
    submitting: false
  },

  onReasonChange(e) {
    this.setData({ selectedReason: e.detail.value });
  },

  onDescInput(e) {
    this.setData({ description: e.detail.value });
  },

  submitReason() {
    if (!this.data.selectedReason || this.data.submitting) {
      return;
    }

    this.setData({ submitting: true });
    failureReport.submitFailureReason(this.data.selectedReason, this.data.description)
      .then(() => {
        wx.showToast({ title: '已提交', icon: 'success' });
        wx.navigateBack({ delta: 1 });
      })
      .catch((error) => {
        wx.showToast({ title: error.message || '提交失败', icon: 'none' });
      })
      .finally(() => {
        this.setData({ submitting: false });
      });
  }
});
