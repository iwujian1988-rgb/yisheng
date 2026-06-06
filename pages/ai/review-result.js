const draftService = require('../../services/content/draft');

function decodeOption(value) {
  return value ? decodeURIComponent(value) : '';
}

Page({
  data: {
    resultText: '',
    confirmText: '',
    provider: ''
  },

  onLoad(options) {
    this.setData({
      resultText: decodeOption(options.resultText),
      confirmText: decodeOption(options.confirmText),
      provider: decodeOption(options.provider)
    });
  },

  sendToComputer() {
    if (!this.data.resultText) {
      wx.showToast({ title: '暂无可发送内容', icon: 'none' });
      return;
    }

    draftService.saveDraft(this.data.resultText, 'ai');
    wx.reLaunch({ url: '/pages/home/home' });
  },

  regenerate() {
    wx.navigateBack({
      delta: 1,
      fail: () => wx.navigateTo({ url: '/pages/ai/detail' })
    });
  },

  goBackEdit() {
    wx.navigateBack();
  }
});
