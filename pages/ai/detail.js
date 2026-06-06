const aiAssistant = require('../../services/ai/assistant');

function createMessage(role, content, extra) {
  return Object.assign({
    id: String(Date.now()) + '-' + Math.floor(Math.random() * 1000),
    role,
    content: content || ''
  }, extra || {});
}

Page({
  data: {
    messages: [],
    inputText: '',
    sending: false,
    scrollTarget: ''
  },

  onInput(e) {
    this.setData({ inputText: e.detail.value || '' });
  },

  sendMessage() {
    const inputText = this.data.inputText.trim();
    if (!inputText || this.data.sending) return;

    const userMessage = createMessage('user', inputText);
    const messages = this.data.messages.concat(userMessage);

    this.setData({
      messages,
      inputText: '',
      sending: true,
      scrollTarget: 'msg-' + userMessage.id
    });

    aiAssistant.generateContent({
      text: inputText,
      type: 'content_polish'
    }).then((result) => {
      const bodyText = result.bodyText || result.resultText || '';
      const assistantMessage = createMessage('assistant', bodyText, {
        resultText: result.resultText || bodyText,
        bodyText,
        confirmText: result.confirmText || '',
        provider: result.provider || '',
        requiresUserConfirm: result.requiresUserConfirm !== false
      });

      this.setData({
        sending: false,
        messages: this.data.messages.concat(assistantMessage),
        scrollTarget: 'msg-' + assistantMessage.id
      });
    }).catch((err) => {
      this.setData({ sending: false });
      wx.showToast({ title: err.message || 'AI 服务暂不可用', icon: 'none' });
    });
  },

  reviewLatestResult() {
    const latest = this.data.messages
      .slice()
      .reverse()
      .find((message) => message.role === 'assistant');

    if (!latest || !latest.bodyText) {
      wx.showToast({ title: '暂无可审核内容', icon: 'none' });
      return;
    }

    const params = [
      'resultText=' + encodeURIComponent(latest.bodyText),
      'confirmText=' + encodeURIComponent(latest.confirmText || ''),
      'provider=' + encodeURIComponent(latest.provider || '')
    ].join('&');

    wx.navigateTo({
      url: '/pages/ai/review-result?' + params
    });
  }
});
