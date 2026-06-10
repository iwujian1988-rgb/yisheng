var aiAssistant = require('../../services/ai/assistant');
var quickActions = require('../../services/ai/quick-actions');
var featureEntitlements = require('../../services/entitlements/features');
var draftService = require('../../services/drafts/draft-service');

function createMessage(role, content, extra) {
  return Object.assign({
    id: String(Date.now()) + '-' + Math.floor(Math.random() * 1000),
    role: role,
    content: content || ''
  }, extra || {});
}

function getConnectedState() {
  var app = typeof getApp === 'function' ? getApp() : null;
  var globalData = app && app.globalData ? app.globalData : {};
  return Boolean(globalData.skipBluetoothForDev || globalData.deviceConnected);
}

Page({
  data: {
    messages: [],
    inputText: '',
    sending: false,
    loadingActions: false,
    scrollTarget: '',
    connected: false,
    quickActions: [],
    categories: [],
    activeAction: null,
    defaultPrompt: ''
  },

  onLoad: function (options) {
    if (!featureEntitlements.guardAiFeature('aiWriting', '智能创作')) {
      wx.navigateBack({
        fail: function () { wx.reLaunch({ url: '/pages/home/home' }); }
      });
      return;
    }
    var connected = getConnectedState();
    this.setData({ connected: connected });
    var initialText = options && options.text ? decodeURIComponent(options.text) : '';
    if (initialText) {
      this.setData({ inputText: initialText });
    }
    this.loadQuickActions();
  },

  loadQuickActions: function () {
    var that = this;
    this.setData({ loadingActions: true });
    quickActions.listQuickActions()
      .then(function (result) {
        that.setData({
          quickActions: result.quickActions || [],
          categories: result.categories || [],
          defaultPrompt: result.defaultPrompt || '',
          loadingActions: false
        });
      })
      .catch(function () {
        that.setData({ quickActions: [], categories: [], loadingActions: false });
      });
  },

  selectAction: function (e) {
    var id = e.currentTarget.dataset.id;
    if (this.data.activeAction && this.data.activeAction.id === id) {
      this.setData({ activeAction: null });
      return;
    }
    var action = this.data.quickActions.find(function (item) { return item.id === id; });
    if (action) this.setData({ activeAction: action });
  },

  clearAction: function () {
    this.setData({ activeAction: null });
  },

  onInput: function (e) {
    this.setData({ inputText: e.detail.value || '' });
  },

  sendMessage: function () {
    var inputText = this.data.inputText.trim();
    if (!inputText || this.data.sending) return;
    if (!this.data.connected) {
      wx.showModal({
        title: '需要连接设备',
        content: '使用 AI 助手需要先连接设备，连接后可解锁全部功能。',
        confirmText: '去连接',
        cancelText: '返回',
        success: function (res) {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/bluetooth/index' });
          }
        }
      });
      return;
    }
    var userMessage = createMessage('user', inputText);
    var actionId = this.data.activeAction ? this.data.activeAction.id : '';
    this.setData({
      messages: this.data.messages.concat(userMessage),
      inputText: '',
      sending: true,
      scrollTarget: 'msg-' + userMessage.id
    });
    var that = this;
    aiAssistant.generateContent({
      text: inputText,
      type: 'content_polish',
      actionId: actionId
    }).then(function (result) {
      var bodyText = result.bodyText || result.resultText || '';
      var assistantMessage = createMessage('assistant', bodyText, {
        resultText: result.resultText || bodyText,
        bodyText: bodyText,
        confirmText: result.confirmText || '',
        provider: result.provider || '',
        requiresUserConfirm: result.requiresUserConfirm !== false
      });
      that.setData({
        sending: false,
        messages: that.data.messages.concat(assistantMessage),
        scrollTarget: 'msg-' + assistantMessage.id
      });
    }).catch(function (err) {
      that.setData({ sending: false });
      wx.showToast({ title: err.message || '服务暂时不可用', icon: 'none' });
    });
  },

  useResult: function (e) {
    var id = e.currentTarget.dataset.id;
    var latest = this.data.messages.find(function (message) { return message.id === id; });
    if (!latest || !latest.bodyText) {
      wx.showToast({ title: '暂无可用内容', icon: 'none' });
      return;
    }
    draftService.saveDraft(latest.bodyText, 'ai');
    wx.navigateTo({ url: '/pages/transfer/editor?source=ai' });
  },

  goVoice: function () {
    wx.navigateTo({ url: '/pages/asr/index' });
  },

  goImage: function () {
    wx.navigateTo({ url: '/pages/ocr/index' });
  }
});
