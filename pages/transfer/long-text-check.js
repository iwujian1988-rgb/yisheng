const draftService = require('../../services/content/draft');

Page({
  data: {
    count: 0,
    estimatedSeconds: 0,
    hasDraft: false
  },

  onLoad(options) {
    const draft = draftService.peekDraft();
    this.setData({
      count: parseInt(options.count, 10) || (draft && draft.text ? draft.text.length : 0),
      estimatedSeconds: parseInt(options.estimatedSeconds, 10) || 0,
      hasDraft: Boolean(draft && draft.text)
    });
  },

  continueSend() {
    if (!this.data.hasDraft) {
      wx.showToast({ title: '暂无待发送文本', icon: 'none' });
      return;
    }

    wx.reLaunch({ url: '/pages/home/home' });
  },

  goBackEdit() {
    wx.navigateBack();
  }
});
