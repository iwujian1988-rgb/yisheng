// pages/training/feedback.js
Page({
  data: { rating: 0, content: '' },
  setRating: function (e) { this.setData({ rating: parseInt(e.currentTarget.dataset.val) }); },
  onContentInput: function (e) { this.setData({ content: e.detail.value }); },
  submitFeedback: function () { wx.showToast({ title: '等待接入反馈服务', icon: 'none' }); }
});
