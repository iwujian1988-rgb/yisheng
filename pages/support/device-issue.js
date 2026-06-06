const supportIssues = require('../../services/support/issues');

Page({
  data: {
    typeOptions: ['无法连接', '传输中断', '指示灯异常', '设备无法识别', '其他'],
    activeType: '',
    description: '',
    serialNo: '',
    canSubmit: false,
    isSubmitting: false
  },

  selectType(e) {
    this.setData({ activeType: e.currentTarget.dataset.type }, this.checkForm);
  },

  onDescriptionInput(e) {
    this.setData({ description: e.detail.value || '' }, this.checkForm);
  },

  onSerialNoInput(e) {
    this.setData({ serialNo: (e.detail.value || '').trim() });
  },

  checkForm() {
    this.setData({
      canSubmit: this.data.activeType.length > 0 && this.data.description.trim().length > 0
    });
  },

  submitIssue() {
    if (!this.data.canSubmit || this.data.isSubmitting) return;
    this.setData({ isSubmitting: true });
    supportIssues.submitDeviceIssue({
      type: this.data.activeType,
      description: this.data.description,
      serialNo: this.data.serialNo
    }).then(() => {
      wx.showToast({ title: '已提交', icon: 'success' });
      this.setData({
        description: '',
        serialNo: '',
        canSubmit: false,
        isSubmitting: false
      });
    }).catch((err) => {
      this.setData({ isSubmitting: false });
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    });
  }
});
