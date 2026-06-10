const draftService = require('../../services/content/draft');
const transferQueue = require('../../services/transfer/queue');

const SOURCE_LABELS = {
  manual: '直接编辑',
  ocr: '图片取字',
  asr: '语音成稿',
  ai: '智能润色',
  template: '场景模板'
};

Page({
  data: {
    text: '',
    source: 'manual',
    sourceLabel: '直接编辑'
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
