const draftService = require('../../services/content/draft');
const templateRenderer = require('../../services/templates/renderer');

Page({
  data: {
    bodyText: '',
    confirmText: '',
    provider: '',
    status: ''
  },

  onLoad(options) {
    if (options.resultText) {
      this.setData({
        bodyText: decodeURIComponent(options.resultText),
        confirmText: '请确认正文内容是否准确，确认后再发送到电脑。',
        provider: 'route'
      });
      return;
    }

    const result = templateRenderer.consumeTemplateResult();
    if (result) {
      this.setData({
        bodyText: result.bodyText || result.resultText || result.rawText || '',
        confirmText: result.confirmText || '',
        provider: result.provider || '',
        status: result.status || ''
      });
    }
  },

  onBodyInput(event) {
    this.setData({ bodyText: event.detail.value || '' });
  },

  copyResult() {
    if (!this.data.bodyText) {
      wx.showToast({ title: '暂无可复制内容', icon: 'none' });
      return;
    }

    wx.setClipboardData({
      data: this.data.bodyText,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' });
      }
    });
  },

  sendToComputer() {
    const text = String(this.data.bodyText || '').trim();
    if (!text) {
      wx.showToast({ title: '暂无可发送内容', icon: 'none' });
      return;
    }
    draftService.saveDraft(text, 'template');
    wx.navigateTo({ url: '/pages/transfer/editor?source=template' });
  },

  regenerate() {
    wx.navigateBack({
      delta: 1,
      fail: () => {
        wx.navigateTo({ url: '/pages/templates/index' });
      }
    });
  }
});
