const draftService = require('../../services/content/draft');

Page({
  data: {
    imageUrl: '',
    resultText: ''
  },

  onLoad(options) {
    this.setData({
      imageUrl: options && options.imageUrl ? decodeURIComponent(options.imageUrl) : '',
      resultText: options && options.resultText ? decodeURIComponent(options.resultText) : ''
    });
  },

  confirmResult() {
    if (!this.data.resultText) {
      wx.showToast({ title: '暂无可用内容', icon: 'none' });
      return;
    }

    draftService.saveDraft(this.data.resultText, 'ocr');
    wx.reLaunch({ url: '/pages/home/home' });
  },

  reRecognize() {
    wx.navigateBack();
  }
});
