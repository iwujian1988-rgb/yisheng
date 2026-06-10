Page({
  data: { rating: 0, content: '' },

  setRating(e) {
    this.setData({ rating: parseInt(e.currentTarget.dataset.val, 10) || 0 });
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value });
  },

  submitFeedback() {
    if (!this.data.rating) {
      wx.showToast({ title: '请选择评分', icon: 'none' });
      return;
    }
    const records = wx.getStorageSync('trainingFeedbacks');
    const nextRecords = Array.isArray(records) ? records : [];
    nextRecords.unshift({
      id: 'training_feedback_' + Date.now(),
      rating: this.data.rating,
      content: this.data.content.trim(),
      createdAt: Date.now()
    });
    wx.setStorageSync('trainingFeedbacks', nextRecords);
    wx.showToast({ title: '已提交', icon: 'success' });
    this.setData({ rating: 0, content: '' });
  }
});
