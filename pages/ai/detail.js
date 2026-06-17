var aiAssistant = require('../../services/ai/assistant');
var modesService = require('../../services/ai/modes');
var quickActionsService = require('../../services/ai/quick-actions');
var conversationManager = require('../../services/ai/conversation');
var featureEntitlements = require('../../services/entitlements/features');
var draftService = require('../../services/content/draft');
var deviceSession = require('../../services/device/session');
var tabBarNav = require('../../services/navigation/tab-bar');

var AI_MEDIA_INPUT_DRAFT_KEY = 'aiMediaInputDraft';

function createMessage(role, content, extra) {
  return Object.assign({
    id: String(Date.now()) + '-' + Math.floor(Math.random() * 1000),
    role: role,
    content: content || ''
  }, extra || {});
}

function sortActions(actions) {
  return (actions || []).slice().sort(function (a, b) {
    return Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
  });
}

function getDefaultProfessionalAction(actions, current) {
  if (current) {
    var kept = actions.find(function (item) { return item.id === current.id; });
    if (kept) return kept;
  }
  return actions.find(function (item) {
    return item.actionCode === 'pro_free_text' || item.title === '自由模式';
  }) || actions[0] || null;
}

function buildSendState(inputText, sending, isProfessionalWorkspace, activeAction, activeMode) {
  var hasText = String(inputText || '').trim().length > 0;
  var hasTask = isProfessionalWorkspace ? Boolean(activeAction) : Boolean(activeMode);
  var canSend = hasText && hasTask && !sending;
  return {
    canSend: canSend,
    sendDisabled: !canSend
  };
}

Page({
  data: {
    messages: [],
    inputText: '',
    sending: false,
    scrollTarget: '',
    modes: [],
    activeMode: null,
    quickActions: [],
    activeAction: null,
    templates: { system: [], custom: [] },
    selectedTemplateId: '',
    showTemplateSelector: false,
    isProfessionalWorkspace: false,
    canSend: false,
    sendDisabled: true,
    round: 0,
    maxRounds: conversationManager.MAX_ROUNDS,
    collapsedHistory: []
  },

  _conversation: null,

  onLoad: function (options) {
    if (!featureEntitlements.guardAiFeature('aiWriting', '智能创作')) {
      wx.navigateBack({
        fail: function () { wx.reLaunch({ url: '/pages/home/home' }); }
      });
      return;
    }

    this._conversation = conversationManager.createConversation();
    var initialText = options && options.text ? decodeURIComponent(options.text) : '';
    this.setData({
      inputText: initialText
    });
    this.consumeMediaInputDraft();
    this.prepareWorkspace();
  },

  onShow: function () {
    tabBarNav.syncTabBar(this, 'pages/ai/detail');
    this.consumeMediaInputDraft();
    this.prepareWorkspace();
  },

  prepareWorkspace: function () {
    var that = this;
    deviceSession.refreshIfNeeded()
      .catch(function () { return null; })
      .then(function () {
        that.setData({
          isProfessionalWorkspace: featureEntitlements.hasDeviceSession()
        }, function () {
          that.loadWorkspace();
          that.refreshSendState();
        });
      });
  },

  loadWorkspace: function () {
    if (featureEntitlements.hasDeviceSession()) {
      this.loadQuickActions();
      return;
    }
    this.loadModes();
  },

  loadModes: function () {
    var that = this;
    modesService.listModes(false).then(function (result) {
      var modes = result.modes || modesService.FALLBACK_MODES;
      that.setData({
        isProfessionalWorkspace: false,
        quickActions: [],
        activeAction: null,
        modes: modes,
        activeMode: that.data.activeMode || modes[0] || null,
        templates: result.templates || { system: [], custom: [] },
        showTemplateSelector: Boolean((that.data.activeMode || modes[0] || {}).showTemplateSelector)
      }, function () {
        that.refreshSendState();
      });
    }).catch(function () {
      var fallback = modesService.FALLBACK_MODES;
      that.setData({
        isProfessionalWorkspace: false,
        quickActions: [],
        activeAction: null,
        modes: fallback,
        activeMode: that.data.activeMode || fallback[0] || null,
        templates: { system: [], custom: [] },
        showTemplateSelector: Boolean((that.data.activeMode || fallback[0] || {}).showTemplateSelector)
      }, function () {
        that.refreshSendState();
      });
    });
  },

  loadQuickActions: function () {
    var that = this;
    quickActionsService.listQuickActions().then(function (result) {
      var professionalActions = sortActions(result.quickActions || []);
      that.setData({
        isProfessionalWorkspace: true,
        modes: [],
        activeMode: null,
        showTemplateSelector: false,
        templates: { system: [], custom: [] },
        quickActions: professionalActions,
        activeAction: getDefaultProfessionalAction(professionalActions, that.data.activeAction)
      }, function () {
        that.refreshSendState();
      });
    }).catch(function () {
      that.setData({
        isProfessionalWorkspace: true,
        modes: [],
        activeMode: null,
        showTemplateSelector: false,
        quickActions: [],
        activeAction: null
      }, function () {
        that.refreshSendState();
      });
    });
  },

  keepSelectedAction: function (actions) {
    var current = this.data.activeAction;
    if (!current) return null;
    return actions.find(function (item) { return item.id === current.id; }) || null;
  },

  selectAction: function (e) {
    var id = e.currentTarget.dataset.id;
    var action = this.data.quickActions.find(function (item) { return item.id === id; });
    if (!action) return;
    var that = this;
    this.setData({ activeAction: action }, function () {
      that.refreshSendState();
    });
  },

  selectMode: function (e) {
    var key = e.currentTarget.dataset.key;
    var mode = this.data.modes.find(function (item) { return item.key === key; });
    if (!mode) return;
    var that = this;
    this.setData({
      activeMode: mode,
      showTemplateSelector: Boolean(mode.showTemplateSelector),
      selectedTemplateId: ''
    }, function () {
      that.refreshSendState();
    });
  },

  onTemplateChange: function (e) {
    var list = (this.data.templates.system || []).concat(this.data.templates.custom || []);
    var index = Number(e.detail.value || 0);
    var selected = list[index] || null;
    this.setData({ selectedTemplateId: selected ? selected.id : '' });
  },

  onInput: function (e) {
    var text = e.detail.value || '';
    this.setData(Object.assign({ inputText: text }, buildSendState(
      text,
      this.data.sending,
      this.data.isProfessionalWorkspace,
      this.data.activeAction,
      this.data.activeMode
    )));
  },

  refreshSendState: function () {
    this.setData(buildSendState(
      this.data.inputText,
      this.data.sending,
      this.data.isProfessionalWorkspace,
      this.data.activeAction,
      this.data.activeMode
    ));
  },

  sendMessage: function () {
    var inputText = String(this.data.inputText || '').trim();
    if (!inputText || this.data.sending) return;

    if (this.data.isProfessionalWorkspace && !this.data.activeAction) {
      wx.showToast({ title: '请选择一个处理方式', icon: 'none' });
      return;
    }
    if (!this.data.isProfessionalWorkspace && !this.data.activeMode) {
      wx.showToast({ title: '请选择一个处理方式', icon: 'none' });
      return;
    }

    var userMessage = createMessage('user', inputText);
    this._conversation.addUserMessage(inputText);

    this.setData({
      messages: this.data.messages.concat(userMessage),
      inputText: '',
      sending: true,
      scrollTarget: 'msg-' + userMessage.id,
      canSend: false,
      sendDisabled: true
    });

    var payload = {
      text: inputText,
      messages: this.getApiHistory()
    };
    if (this.data.isProfessionalWorkspace) {
      payload.actionId = this.data.activeAction.id;
    } else {
      payload.mode = this.data.activeMode.key;
      payload.templateId = this.data.selectedTemplateId || '';
    }

    var that = this;
    aiAssistant.generateContent(payload).then(function (result) {
      var bodyText = result.bodyText || result.resultText || '';
      var assistantMessage = createMessage('assistant', bodyText, {
        resultText: result.resultText || bodyText,
        bodyText: bodyText,
        confirmText: result.confirmText || '',
        provider: result.provider || '',
        requiresUserConfirm: result.requiresUserConfirm !== false
      });
      that._conversation.addAssistantMessage(bodyText);

      that.setData({
        sending: false,
        messages: that.data.messages.concat(assistantMessage),
        round: that._conversation.getRounds(),
        collapsedHistory: that.buildCollapsedHistory(),
        scrollTarget: 'msg-' + assistantMessage.id
      }, function () {
        that.refreshSendState();
      });
    }).catch(function (err) {
      that.setData({ sending: false }, function () {
        that.refreshSendState();
      });
      wx.showToast({ title: err.message || '服务暂时不可用', icon: 'none' });
    });
  },

  getApiHistory: function () {
    var apiMessages = this._conversation.getHistoryForApi();
    apiMessages.pop();
    return apiMessages;
  },

  toggleHistory: function (e) {
    var idx = e.currentTarget.dataset.index;
    var key = 'collapsedHistory[' + idx + '].expanded';
    this.setData({ [key]: !this.data.collapsedHistory[idx].expanded });
  },

  resetSession: function () {
    this._conversation.reset();
    this.setData({
      messages: [],
      round: 0,
      collapsedHistory: [],
      scrollTarget: ''
    });
  },

  buildCollapsedHistory: function () {
    var msgs = this._conversation.getDisplayMessages();
    var history = [];
    for (var i = 0; i < msgs.length - 2; i += 2) {
      history.push({
        userSummary: (msgs[i].content || '').slice(0, 40),
        assistantSummary: (msgs[i + 1].content || '').slice(0, 40),
        expanded: false,
        userFull: msgs[i].content,
        assistantFull: msgs[i + 1].content
      });
    }
    return history;
  },

  useResult: function (e) {
    var id = e.currentTarget.dataset.id;
    var latest = this.data.messages.find(function (message) { return message.id === id; });
    if (!latest || !latest.bodyText) {
      wx.showToast({ title: '暂无可用内容', icon: 'none' });
      return;
    }
    if (!featureEntitlements.isBluetoothConnected()) {
      wx.showModal({
        title: '请先连接设备',
        content: '发送到电脑需要先连接蓝牙设备。',
        confirmText: '去连接',
        cancelText: '取消',
        success: function (res) {
          if (res.confirm) wx.navigateTo({ url: '/pages/bluetooth/index' });
        }
      });
      return;
    }
    draftService.saveDraft(latest.bodyText, 'ai');
    wx.navigateTo({ url: '/pages/transfer/editor?source=ai' });
  },

  goVoice: function () {
    this.openMediaInput('/pages/asr/index?returnTo=ai&auto=1', '语音转文字');
  },

  goImage: function () {
    wx.showToast({ title: '请从首页进入图片识别', icon: 'none' });
  },

  openMediaInput: function (url, name) {
    if (!featureEntitlements.guardAiFeature(url.indexOf('/asr/') !== -1 ? 'asr' : 'ocr', name)) return;
    wx.showLoading({ title: '正在打开' });
    deviceSession.refreshIfNeeded()
      .catch(function () { return null; })
      .then(function () {
        wx.hideLoading();
        wx.navigateTo({
          url: url,
          fail: function (err) {
            wx.showToast({
              title: (err && err.errMsg) || '页面暂时打不开',
              icon: 'none'
            });
          }
        });
      });
  },

  goTemplateImport: function () {
    wx.navigateTo({ url: '/pages/ai/template-import' });
  },

  consumeMediaInputDraft: function () {
    var draft = wx.getStorageSync(AI_MEDIA_INPUT_DRAFT_KEY);
    if (!draft || !draft.text) return;

    wx.removeStorageSync(AI_MEDIA_INPUT_DRAFT_KEY);
    var current = String(this.data.inputText || '').trim();
    var incoming = String(draft.text || '').trim();
    var that = this;
    this.setData({
      inputText: current ? current + '\n' + incoming : incoming
    }, function () {
      that.refreshSendState();
    });
  }
});
