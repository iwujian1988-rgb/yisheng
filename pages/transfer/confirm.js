const draftService = require('../../services/content/draft');
const transferQueue = require('../../services/transfer/queue');

const SOURCE_LABELS = {
  manual: '手动输入',
  ocr: '拍照识别',
  asr: '录音转写',
  ai: 'AI 整理',
  template: '模板生成'
};

Page({
  data: {
    text: '',
    source: 'manual',
    sourceLabel: '手动输入'
  },

  onLoad(options) {
    const text = options.text ? decodeURIComponent(options.text) : '';
    const source = options.source ? decodeURIComponent(options.source) : 'manual';

    this.setData({
      text,
      source,
      sourceLabel: SOURCE_LABELS[source] || '未知来源'
    });
  },

  confirmSend() {
    if (!this.data.text) {
      wx.showToast({ title: '暂无可发送内容', icon: 'none' });
      return;
    }

    transferQueue.enqueueText(this.data.text, this.data.source);
    draftService.saveDraft(this.data.text, this.data.source);
    wx.reLaunch({ url: '/pages/home/home' });
  },

  goBackEdit() {
    wx.navigateBack();
  }
});
