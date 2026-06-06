const draftService = require('../../services/content/draft');
const templateRenderer = require('../../services/templates/renderer');

Page({
  data: {
    bodyText: '',
    confirmText: '',
    provider: ''
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
        provider: result.provider || ''
      });
    }
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
    if (!this.data.bodyText) {
      wx.showToast({ title: '暂无可发送内容', icon: 'none' });
      return;
    }
    draftService.saveDraft(this.data.bodyText, 'template');
    wx.reLaunch({ url: '/pages/home/home' });
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
