const draftService = require('../../services/content/draft');

Page({
  data: {
    audioStatus: '',
    resultText: '',
    resultMeta: null,
    resultKey: ''
  },

  onLoad(options) {
    const resultKey = options && options.resultKey ? decodeURIComponent(options.resultKey) : '';
    const stored = resultKey ? wx.getStorageSync(resultKey) : null;
    if (stored && stored.resultText) {
      this.setData({
        audioStatus: stored.audioStatus || '录音已完成',
        resultText: stored.resultText || '',
        resultMeta: stored.resultMeta || null,
        resultKey
      });
      return;
    }

    this.setData({
      audioStatus: options && options.audioStatus ? decodeURIComponent(options.audioStatus) : '',
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

    draftService.saveDraft(this.data.resultText, 'asr');
    if (this.data.resultKey) {
      wx.removeStorageSync(this.data.resultKey);
    }
    wx.navigateTo({ url: '/pages/transfer/editor?source=asr' });
  },

  updateResultText(event) {
    this.setData({
      resultText: event && event.detail ? event.detail.value : ''
    });
  },

  reRecord() {
    wx.navigateBack();
  }
});
