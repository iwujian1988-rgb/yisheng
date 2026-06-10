const draftService = require('../../services/content/draft');

Page({
  data: {
    imageUrl: '',
    resultText: '',
    resultMeta: null,
    resultKey: ''
  },

  onLoad(options) {
    const resultKey = options && options.resultKey ? decodeURIComponent(options.resultKey) : '';
    const stored = resultKey ? wx.getStorageSync(resultKey) : null;
    if (stored && stored.resultText) {
      this.setData({
        imageUrl: stored.imageUrl || '',
        resultText: stored.resultText || '',
        resultMeta: stored.resultMeta || null,
        resultKey
      });
      return;
    }

    this.setData({
      imageUrl: options && options.imageUrl ? decodeURIComponent(options.imageUrl) : '',
      resultText: options && options.resultText ? decodeURIComponent(options.resultText) : '',
      resultMeta: null,
      resultKey
    });
  },

  confirmResult() {
    if (!this.data.resultText) {
      wx.showToast({ title: '暂无可用内容', icon: 'none' });
      return;
    }

    draftService.saveDraft(this.data.resultText, 'ocr');
    if (this.data.resultKey) {
      wx.removeStorageSync(this.data.resultKey);
    }
    wx.navigateTo({ url: '/pages/transfer/editor?source=ocr' });
  },

  updateResultText(event) {
    this.setData({
      resultText: event && event.detail ? event.detail.value : ''
    });
  },

  reRecognize() {
    wx.navigateBack();
  }
});
