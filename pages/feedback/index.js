const feedbackService = require('../../services/feedback/submissions');

Page({
  data: {
    typeOptions: ['功能建议', '使用问题', '设备问题', '其他'],
    activeType: '功能建议',
    content: '',
    contact: '',
    canSubmit: false,
    isSubmitting: false
  },

  selectType(e) {
    this.setData({ activeType: e.currentTarget.dataset.type }, this.checkForm);
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value || '' }, this.checkForm);
  },

  onContactInput(e) {
    this.setData({ contact: (e.detail.value || '').trim() });
  },

  checkForm() {
    this.setData({
      canSubmit: this.data.activeType.length > 0 && this.data.content.trim().length > 0
    });
  },

  submitFeedback() {
    if (!this.data.canSubmit || this.data.isSubmitting) return;
    this.setData({ isSubmitting: true });
    feedbackService.submitFeedback({
      type: this.data.activeType,
      content: this.data.content,
      contact: this.data.contact
    }).then(() => {
      wx.showToast({ title: '已提交', icon: 'success' });
      this.setData({
        content: '',
        contact: '',
        canSubmit: false,
        isSubmitting: false
      });
    }).catch((err) => {
      this.setData({ isSubmitting: false });
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    });
  }
});
