const draftService = require('../../services/content/draft');

Page({
  data: {
    audioStatus: '',
    resultText: ''
  },

  onLoad(options) {
    this.setData({
      audioStatus: options && options.audioStatus ? decodeURIComponent(options.audioStatus) : '',
      resultText: options && options.resultText ? decodeURIComponent(options.resultText) : ''
    });
  },

  confirmResult() {
    if (!this.data.resultText) {
      wx.showToast({ title: '暂无可用内容', icon: 'none' });
      return;
    }

    draftService.saveDraft(this.data.resultText, 'asr');
    wx.reLaunch({ url: '/pages/home/home' });
  },

  reRecord() {
    wx.navigateBack();
  }
});
