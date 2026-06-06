const qaState = require('../../services/qa/check-state');

Page({
  data: {
    types: [
      { value: 'ui', label: '界面显示' },
      { value: 'function', label: '功能异常' },
      { value: 'bluetooth', label: '蓝牙问题' },
      { value: 'crash', label: '闪退问题' },
      { value: 'other', label: '其他' }
    ],
    selectedType: '',
    steps: '',
    expected: '',
    actual: '',
    canSubmit: false,
    submitting: false
  },

  onTypeChange(e) {
    this.setData({ selectedType: e.detail.value }, this.checkCanSubmit);
  },

  onStepsInput(e) {
    this.setData({ steps: e.detail.value }, this.checkCanSubmit);
  },

  onExpectedInput(e) {
    this.setData({ expected: e.detail.value }, this.checkCanSubmit);
  },

  onActualInput(e) {
    this.setData({ actual: e.detail.value }, this.checkCanSubmit);
  },

  checkCanSubmit() {
    this.setData({
      canSubmit: Boolean(this.data.selectedType && this.data.steps.trim().length > 0)
    });
  },

  submitBug() {
    if (!this.data.canSubmit || this.data.submitting) {
      return;
    }
    this.setData({ submitting: true });
    qaState.submitBugReport({
      type: this.data.selectedType,
      steps: this.data.steps,
      expected: this.data.expected,
      actual: this.data.actual
    }).then(() => {
      wx.showToast({ title: '已提交', icon: 'success' });
      wx.navigateBack({ delta: 1 });
    }).catch((err) => {
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    }).finally(() => {
      this.setData({ submitting: false });
    });
  }
});
