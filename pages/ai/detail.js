var agentChat = require('../../services/agent/chat');
var agentText = require('../../services/agent/text');
var deviceSession = require('../../services/device/session');
var bleLink = require('../../services/device/ble-link');
var liveHeartbeat = require('../../services/device/live-heartbeat');
var featureEntitlements = require('../../services/entitlements/features');
var draftService = require('../../services/content/draft');
var tabBarNav = require('../../services/navigation/tab-bar');
var ocrRecognizer = require('../../services/ocr/recognizer');

var AI_MEDIA_INPUT_DRAFT_KEY = 'aiMediaInputDraft';
var AI_WORKSPACE_DRAFT_KEY = 'aiWorkspaceDraftV1';
var MAX_PENDING_IMAGES = 3;
var COMPRESS_QUALITY = 70;
var COMPRESS_MAX_WIDTH = 1280;

function looksLikeMarkdown(text) {
  var value = String(text || '');
  return /(^|\n)\s{0,3}#{1,6}\s|(\*\*|__|```)|(\n\s*[-*]\s)/.test(value);
}

function buildChatContentParts(bodyText, thinkingText) {
  var parts = [];
  if (thinkingText) {
    parts.push({ type: 'thinking', data: String(thinkingText) });
  }
  if (bodyText) {
    parts.push({
      type: looksLikeMarkdown(bodyText) ? 'markdown' : 'text',
      data: String(bodyText)
    });
  }
  return parts;
}

function buildUserChatContent(text, attachments) {
  var parts = [];
  var list = attachments || [];
  if (list.length) {
    parts.push({
      type: 'attachment',
      data: list.map(function (item, index) {
        return {
          fileType: 'image',
          name: 'image-' + (index + 1) + '.jpg',
          url: item.previewUrl || '',
          size: 0
        };
      })
    });
  }
  if (text) {
    parts.push({ type: 'text', data: text });
  }
  if (!parts.length) {
    parts.push({ type: 'text', data: '' });
  }
  return parts;
}

function attachmentsToPreviewItems(attachments) {
  return (attachments || []).map(function (item) {
    return {
      id: item.id,
      fileType: 'image',
      name: 'image.jpg',
      url: item.previewUrl,
      size: 0,
      ocrStatus: item.ocrStatus || (item.ocrReady ? 'done' : '')
    };
  });
}

function hasRecognizingAttachment(attachments) {
  return (attachments || []).some(function (item) {
    return item.ocrStatus === 'recognizing';
  });
}

function collectTemplateGuideFields(fields) {
  var result = [];

  function visit(value, key) {
    if (value === undefined || value === null) return;
    if (typeof value === 'string') {
      result.push({ key: key || value, label: value, required: false, description: '' });
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(function (item, index) { visit(item, String(index)); });
      return;
    }
    if (typeof value !== 'object') return;
    if (value.label) {
      result.push({
        key: key || value.label,
        label: String(value.label),
        required: Boolean(value.is_required || value.isRequired || value.required),
        description: String(value.description || '')
      });
      return;
    }
    Object.keys(value).forEach(function (childKey) { visit(value[childKey], childKey); });
  }

  visit(fields, '');
  return result.filter(function (item, index, list) {
    return item.label && list.findIndex(function (candidate) { return candidate.label === item.label; }) === index;
  });
}

function buildTemplateGuideState(template, expanded) {
  var fields = collectTemplateGuideFields(template && template.fields);
  var prioritized = fields.filter(function (item) { return item.required; }).concat(
    fields.filter(function (item) { return !item.required; })
  );
  var limit = expanded ? 16 : 8;
  return {
    selectedTemplate: template || null,
    templateGuideFields: fields,
    visibleTemplateGuideFields: prioritized.slice(0, limit),
    templateGuideExpanded: Boolean(expanded),
    templateGuideHiddenCount: Math.max(0, prioritized.length - limit)
  };
}

function buildConfirmedTemplateMessage(message) {
  return [
    '【用户已确认的生成材料】',
    message || '用户本次仅提供了附件材料。',
    '',
    '请严格依据以上文字和附件中可识别的内容生成当前模板文书。未提供、未知或不确定的信息不得猜测或补写；先完成可生成部分，并在结果的待确认项中列出仍建议补充的字段。'
  ].join('\n');
}

function hasFailedAttachment(attachments) {
  return (attachments || []).some(function (item) {
    return item.ocrStatus === 'failed';
  });
}

function shouldRenderDocument(message, selectedTemplateId) {
  var text = String(message && (message.bodyText || message.streamingText || message.content) || '');
  return Boolean(selectedTemplateId) || text.length >= 360 || /【正文】|主诉|现病史|既往史|体格检查/.test(text);
}

function attachmentsToUploadPayload(attachments) {
  return (attachments || []).map(function (item) {
    var upload = item.upload || {};
    var ocrText = String(item.ocrText || upload.ocrText || '').trim();
    if (ocrText) {
      return {
        type: 'image',
        ocrText: ocrText,
        mimeType: upload.mimeType || item.mimeType || 'image/jpeg'
      };
    }
    if (upload.type) return upload;
    return {
      type: item.type || 'image',
      data: item.data,
      mimeType: item.mimeType || 'image/jpeg'
    };
  });
}

function compressImagePath(filePath) {
  return new Promise(function (resolve) {
    if (!wx.compressImage) {
      resolve(filePath);
      return;
    }
    wx.compressImage({
      src: filePath,
      quality: COMPRESS_QUALITY,
      compressedWidth: COMPRESS_MAX_WIDTH,
      success: function (res) {
        resolve((res && res.tempFilePath) || filePath);
      },
      fail: function () {
        resolve(filePath);
      }
    });
  });
}

function readImageBase64(filePath) {
  return new Promise(function (resolve, reject) {
    wx.getFileSystemManager().readFile({
      filePath: filePath,
      encoding: 'base64',
      success: function (fileRes) {
        resolve('data:image/jpeg;base64,' + fileRes.data);
      },
      fail: reject
    });
  });
}

function buildAttachmentFromPath(filePath, attachmentId) {
  return compressImagePath(filePath).then(function (compressedPath) {
    return ocrRecognizer.recognizeImage({ path: compressedPath, source: 'ai_chat' }).then(function (result) {
      var ocrText = String((result && result.text) || '').trim();
      var attachment = {
        id: attachmentId,
        previewUrl: compressedPath,
        ocrText: ocrText,
        ocrReady: Boolean(ocrText),
        ocrStatus: 'done'
      };
      if (ocrText) {
        attachment.upload = {
          type: 'image',
          ocrText: ocrText,
          mimeType: 'image/jpeg'
        };
        return attachment;
      }
      return readImageBase64(compressedPath).then(function (dataUrl) {
        attachment.upload = {
          type: 'image',
          data: dataUrl,
          mimeType: 'image/jpeg'
        };
        return attachment;
      });
    }).catch(function () {
      return readImageBase64(compressedPath).then(function (dataUrl) {
        return {
          id: attachmentId,
          previewUrl: compressedPath,
          ocrText: '',
          ocrReady: false,
          ocrStatus: 'done',
          upload: {
            type: 'image',
            data: dataUrl,
            mimeType: 'image/jpeg'
          }
        };
      });
    });
  });
}

function createAttachmentPlaceholder(filePath) {
  return {
    id: 'att-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    previewUrl: filePath,
    ocrText: '',
    ocrReady: false,
    ocrStatus: 'recognizing',
    upload: null
  };
}

function replaceAttachmentById(attachments, attachmentId, nextAttachment) {
  return (attachments || []).map(function (item) {
    return item.id === attachmentId ? nextAttachment : item;
  });
}

function createMessage(role, content, extra) {
  extra = extra || {};
  var message = Object.assign({
    id: String(Date.now()) + '-' + Math.floor(Math.random() * 1000),
    role: role,
    content: content || '',
    chatContent: [{ type: 'text', data: content || '' }],
    status: role === 'assistant' ? 'complete' : ''
  }, extra);

  if (extra.chatContent) {
    message.chatContent = extra.chatContent;
  } else if (extra.thinkingText || extra.bodyText || extra.streamingText) {
    message.chatContent = buildChatContentParts(
      extra.bodyText || extra.streamingText || content || '',
      extra.thinkingText || ''
    );
  }

  return message;
}

function buildConversationHistory(messages) {
  return (messages || []).filter(function (item) {
    return item
      && (item.role === 'user' || item.role === 'assistant')
      && item.status !== 'pending';
  }).map(function (item) {
    var content = item.role === 'assistant'
      ? (item.bodyText || item.streamingText || item.content || '')
      : (item.content || '');
    return {
      role: item.role,
      content: String(content).trim()
    };
  }).filter(function (item) {
    return item.content;
  }).slice(-20);
}

function updateMessageById(messages, messageId, patch) {
  return (messages || []).map(function (item) {
    if (item.id !== messageId) return item;
    var next = Object.assign({}, item, patch);
    var displayText = next.bodyText || next.streamingText || next.content || '';
    if (patch.bodyText !== undefined || patch.streamingText !== undefined) {
      next.chatContent = buildChatContentParts(
        displayText,
        next.thinkingText || ''
      );
      next.content = displayText;
    }
    return next;
  });
}

Page({
  data: {
    messages: [],
    inputText: '',
    sending: false,
    templates: [],
    templateNames: [],
    selectedTemplateId: '',
    selectedTemplateIndex: 0,
    templateLabel: '选择模板（可选）',
    selectedTemplateName: '',
    selectedTemplate: null,
    templateGuideFields: [],
    visibleTemplateGuideFields: [],
    templateGuideExpanded: false,
    templateGuideHiddenCount: 0,
    templateGuideAfterMessageId: '',
    templateConfirmVisible: false,
    templateConfirmPreview: '',
    templatePickerVisible: false,
    templateSearchKeyword: '',
    templatePickerItems: [],
    templatesLoading: false,
    templatesLoadError: '',
    confirmEditorVisible: false,
    confirmEditorMessageId: '',
    confirmEditorIndex: -1,
    confirmEditorTitle: '',
    confirmEditorHint: '',
    confirmEditorText: '',
    pendingAttachments: [],
    pendingPreviewItems: [],
    maxPendingImages: MAX_PENDING_IMAGES,
    canSend: false,
    sendDisabled: true,
    isProfessionalWorkspace: false,
    sendingStageLabel: '',
    streamingMessageId: '',
    recognizingAttachments: false,
    activeStreamTask: null,
    cancelledMessageId: ''
  },

  onLoad: function (options) {
    var that = this;
    featureEntitlements.guardAiFeature('aiWriting', '智能创作').then(function (ok) {
      if (!ok) {
        wx.navigateBack({ fail: function () { wx.reLaunch({ url: '/pages/home/home' }); } });
        return;
      }
      var initialText = options && options.text ? decodeURIComponent(options.text) : '';
      var workspaceDraft = wx.getStorageSync(AI_WORKSPACE_DRAFT_KEY) || {};
      that.setData({ inputText: initialText || workspaceDraft.inputText || '' });
      if (workspaceDraft.templateId) wx.setStorageSync('selectedTemplateId', workspaceDraft.templateId);
      that.consumeMediaInputDraft();
      that._workspaceAuthorized = true;
      that.prepareWorkspace();
    });
  },

  onShow: function () {
    tabBarNav.syncTabBar(this, 'pages/ai/detail');
    this.consumeMediaInputDraft();
    if (this._workspaceAuthorized && this._workspaceReady) this.prepareWorkspace();
  },

  scrollChatToBottom: function () {
    var chatList = this.selectComponent('#chatList');
    if (chatList && typeof chatList.scrollToBottom === 'function') {
      chatList.scrollToBottom();
    }
  },

  setPendingAttachments: function (attachments, callback) {
    this.setData({
      pendingAttachments: attachments,
      pendingPreviewItems: attachmentsToPreviewItems(attachments)
    }, callback);
  },

  prepareWorkspace: function () {
    var that = this;
    var loadId = (this._templateLoadId || 0) + 1;
    this._templateLoadId = loadId;
    this.setData({ templatesLoading: true, templatesLoadError: '' });

    this.prepareProfessionalContext().then(function (professional) {
      if (loadId !== that._templateLoadId) return null;
      that.setData({ isProfessionalWorkspace: professional });
      return agentText.listTemplates();
    }).then(function (templates) {
      if (!templates || loadId !== that._templateLoadId) return;
      if (!that.data.isProfessionalWorkspace) {
        templates = templates.filter(function (item) {
          return !(item.audience === 'professional' && item.tag === 'official');
        });
      }
      that.applyTemplateList(templates);
      that._workspaceReady = true;
      that.setData({ templatesLoading: false, templatesLoadError: '' });
    }).catch(function (error) {
      if (loadId !== that._templateLoadId) return;
      that._workspaceReady = true;
      that.setData({
        templatesLoading: false,
        templatesLoadError: (error && error.message) || '模板加载失败，请重试'
      });
    });

    this.refreshSendState();
  },

  prepareProfessionalContext: function () {
    if (!bleLink.isBleLinkReady()) return Promise.resolve(false);
    return deviceSession.ensureActiveSession()
      .then(function () { return liveHeartbeat.tick(); })
      .then(function () {
        return Boolean(deviceSession.getDeviceSessionToken() && wx.getStorageSync('deviceLiveProof'));
      })
      .catch(function () { return false; });
  },

  applyTemplateList: function (templates) {
    templates = templates || [];
    var names = templates.map(function (item) { return item.name; });
    var storedSelectedId = wx.getStorageSync('selectedTemplateId') || '';
    var selectedId = storedSelectedId || this.data.selectedTemplateId || '';
    var selectedIndex = 0;
    var selectedTemplateId = '';
    var templateLabel = '选择模板（可选）';
    var selectedTemplateName = '';

    if (selectedId) {
      if (storedSelectedId) wx.removeStorageSync('selectedTemplateId');
      for (var i = 0; i < templates.length; i += 1) {
        if (templates[i].id === selectedId) {
          selectedIndex = i;
          selectedTemplateId = selectedId;
          selectedTemplateName = templates[i].name;
          templateLabel = '已选：' + templates[i].name;
          break;
        }
      }
    }

    var selectedTemplate = selectedTemplateId ? templates[selectedIndex] : null;
    var keepExistingGuideAnchor = selectedTemplateId && this.data.selectedTemplateId === selectedTemplateId;
    this.setData(Object.assign({
      templates: templates,
      templateNames: names,
      selectedTemplateIndex: selectedIndex,
      selectedTemplateId: selectedTemplateId,
      selectedTemplateName: selectedTemplateName,
      templateLabel: templateLabel,
      templatePickerItems: this.buildTemplatePickerItems(templates, ''),
      templateGuideAfterMessageId: keepExistingGuideAnchor
        ? this.data.templateGuideAfterMessageId
        : (((this.data.messages || []).slice(-1)[0] || {}).id || '')
    }, buildTemplateGuideState(selectedTemplate, false)), this.persistWorkspaceDraft.bind(this));
  },

  buildTemplatePickerItems: function (templates, keyword) {
    var recentIds = wx.getStorageSync('aiRecentTemplateIds') || [];
    var query = String(keyword || '').trim().toLowerCase();
    return (templates || []).filter(function (item) {
      return !query || [item.name, item.templateType, item.template_type].join(' ').toLowerCase().indexOf(query) >= 0;
    }).map(function (item) {
      return Object.assign({}, item, {
        category: item.templateType || item.template_type || '其他',
        isRecent: recentIds.indexOf(item.id) >= 0
      });
    }).sort(function (a, b) { return Number(b.isRecent) - Number(a.isRecent); });
  },

  openTemplatePicker: function () {
    var that = this;
    featureEntitlements.guardAiFeature('templates', '场景模板').then(function (ok) {
      if (!ok) return;
      that.setData({
        templatePickerVisible: true,
        templateSearchKeyword: '',
        templatePickerItems: that.buildTemplatePickerItems(that.data.templates, '')
      });
    });
  },

  closeTemplatePicker: function () {
    this.setData({ templatePickerVisible: false });
  },

  noop: function () {},

  onTemplateSearch: function (e) {
    var keyword = e.detail && e.detail.value || '';
    this.setData({
      templateSearchKeyword: keyword,
      templatePickerItems: this.buildTemplatePickerItems(this.data.templates, keyword)
    });
  },

  selectTemplateFromPicker: function (e) {
    var id = e.currentTarget.dataset.id;
    var index = (this.data.templates || []).findIndex(function (item) { return item.id === id; });
    if (index < 0) return;
    var recentIds = wx.getStorageSync('aiRecentTemplateIds') || [];
    wx.setStorageSync('aiRecentTemplateIds', [id].concat(recentIds.filter(function (item) { return item !== id; })).slice(0, 5));
    this.selectTemplateByIndex(index);
    this.closeTemplatePicker();
  },

  _openTemplatePickerInner: function () {
    var names = (this.data.templateNames || []).slice();
    var itemList = names.slice();

    if (names.length) {
      itemList.push('导入模板');
      if (this.data.selectedTemplateId) itemList.push('不使用模板');
    } else {
      itemList = ['浏览场景模板', '导入模板'];
    }

    var that = this;
    wx.showActionSheet({
      itemList: itemList,
      success: function (res) {
        var tapIndex = res.tapIndex;
        if (names.length) {
          if (tapIndex < names.length) {
            that.selectTemplateByIndex(tapIndex);
            return;
          }
          if (tapIndex === names.length) {
            that.goTemplateImport();
            return;
          }
          if (tapIndex === names.length + 1) that.clearTemplateSelection();
          return;
        }
        if (tapIndex === 0) {
          wx.switchTab({ url: '/pages/templates/index' });
          return;
        }
        if (tapIndex === 1) that.goTemplateImport();
      }
    });
  },

  selectTemplateByIndex: function (index) {
    var selected = (this.data.templates || [])[index] || null;
    this.setData(Object.assign({
      selectedTemplateIndex: index,
      selectedTemplateId: selected ? selected.id : '',
      selectedTemplateName: selected ? selected.name : '',
      templateLabel: selected ? ('已选：' + selected.name) : '选择模板（可选）',
      templateGuideAfterMessageId: (((this.data.messages || []).slice(-1)[0] || {}).id || '')
    }, buildTemplateGuideState(selected, false)), function () {
      this.persistWorkspaceDraft();
      this.scrollChatToBottom();
    }.bind(this));
  },

  clearTemplateSelection: function () {
    this._pendingTemplateSend = null;
    this.setData(Object.assign({
      selectedTemplateIndex: 0,
      selectedTemplateId: '',
      selectedTemplateName: '',
      templateLabel: '选择模板（可选）',
      templatePickerVisible: false,
      templateConfirmVisible: false,
      templateConfirmPreview: '',
      templateGuideAfterMessageId: ''
    }, buildTemplateGuideState(null, false)), this.persistWorkspaceDraft.bind(this));
  },

  toggleTemplateGuide: function () {
    var selected = this.data.selectedTemplate;
    if (!selected) return;
    this.setData(buildTemplateGuideState(selected, !this.data.templateGuideExpanded));
  },

  insertTemplateField: function (e) {
    var label = String(e.currentTarget.dataset.label || '').trim();
    if (!label) return;
    var current = String(this.data.inputText || '');
    var prefix = current && !/\n$/.test(current) ? '\n' : '';
    this.setData({ inputText: current + prefix + label + '：' }, function () {
      this.persistWorkspaceDraft();
      this.refreshSendState();
    }.bind(this));
  },

  insertTemplateOutline: function () {
    var fields = (this.data.visibleTemplateGuideFields || []).slice(0, 8);
    if (!fields.length) return;
    var outline = fields.map(function (item) { return item.label + '：'; }).join('\n');
    var current = String(this.data.inputText || '').trim();
    this.setData({ inputText: current ? current + '\n' + outline : outline }, function () {
      this.persistWorkspaceDraft();
      this.refreshSendState();
    }.bind(this));
  },

  closeTemplateConfirm: function () {
    this._pendingTemplateSend = null;
    this.setData({ templateConfirmVisible: false, templateConfirmPreview: '' });
  },

  confirmTemplateSubmission: function () {
    var pending = this._pendingTemplateSend;
    if (!pending) return;
    this._pendingTemplateSend = null;
    this.setData({ templateConfirmVisible: false, templateConfirmPreview: '' });
    this.sendMessage(Object.assign({}, pending, { skipTemplateConfirm: true }));
  },

  goTemplateImport: function () {
    featureEntitlements.guardAiFeature('templates', '场景模板').then(function (ok) {
      if (!ok) return;
      this.setData({ templatePickerVisible: false });
      wx.navigateTo({ url: '/pages/ai/template-import' });
    }.bind(this));
  },

  onInput: function (e) {
    var text = (e.detail && e.detail.value !== undefined) ? e.detail.value : '';
    this.setData({ inputText: text }, function () {
      this.persistWorkspaceDraft();
      this.refreshSendState();
    }.bind(this));
  },

  persistWorkspaceDraft: function () {
    var inputText = String(this.data.inputText || '');
    var templateId = this.data.selectedTemplateId || '';
    if (!inputText && !templateId) {
      wx.removeStorageSync(AI_WORKSPACE_DRAFT_KEY);
      return;
    }
    wx.setStorageSync(AI_WORKSPACE_DRAFT_KEY, {
      inputText: inputText,
      templateId: templateId,
      updatedAt: Date.now()
    });
  },

  refreshSendState: function () {
    var hasText = String(this.data.inputText || '').trim().length > 0;
    var attachments = this.data.pendingAttachments || [];
    var hasAttachment = attachments.length > 0;
    var recognizing = hasRecognizingAttachment(attachments);
    var failed = hasFailedAttachment(attachments);
    var canSend = (hasText || hasAttachment) && !this.data.sending && !recognizing && !failed;
    this.setData({ canSend: canSend, sendDisabled: !canSend, recognizingAttachments: recognizing });
  },

  sendMessage: function (options) {
    options = options || {};
    if ((!this.data.canSend && !options.message) || this.data.sending) return;

    // Let users dismiss the keyboard before the response starts streaming.
    if (wx.hideKeyboard) {
      wx.hideKeyboard({ fail: function () {} });
    }

    var message = String(options.message !== undefined ? options.message : this.data.inputText || '').trim();
    var attachments = options.attachments || (this.data.pendingAttachments || []).slice();
    if (!message && !attachments.length) return;
    var isDocumentRevision = Boolean(options.applyToDocumentId);
    var templateId = options.templateId !== undefined ? options.templateId : (this.data.selectedTemplateId || '');
    if (templateId && !isDocumentRevision && !options.skipTemplateConfirm) {
      this._pendingTemplateSend = { message: message, attachments: attachments, templateId: templateId };
      this.setData({
        templateConfirmVisible: true,
        templateConfirmPreview: message || ('已添加 ' + attachments.length + ' 张图片')
      });
      return;
    }
    var apiMessage = templateId && !isDocumentRevision ? buildConfirmedTemplateMessage(message) : message;
    var visibleMessage = isDocumentRevision ? '正在按补充信息修订文书' : message;
    var conversationHistory = buildConversationHistory(this.data.messages);

    var userMessage = createMessage('user', visibleMessage, {
      chatContent: buildUserChatContent(visibleMessage, attachments),
      rawAttachments: attachments,
      isRevisionRequest: isDocumentRevision,
      revisionTargetId: options.applyToDocumentId || ''
    });

    var streamMessage = createMessage('assistant', '', {
      status: 'pending',
      streamingText: '',
      bodyText: '',
      resultType: 'text',
      request: {
        message: apiMessage,
        restoreMessage: isDocumentRevision ? '' : message,
        attachments: attachments,
        templateId: templateId,
        applyToDocumentId: options.applyToDocumentId || '',
        forceDocument: Boolean(options.forceDocument)
      }
    });

    var needsServerOcr = attachments.some(function (item) {
      return !String(item.ocrText || '').trim();
    });

    this.setData({
      messages: this.data.messages.concat(userMessage, streamMessage),
      inputText: isDocumentRevision ? this.data.inputText : '',
      pendingAttachments: isDocumentRevision ? this.data.pendingAttachments : [],
      pendingPreviewItems: isDocumentRevision ? this.data.pendingPreviewItems : [],
      sending: true,
      streamingMessageId: streamMessage.id,
      sendingStageLabel: needsServerOcr ? '识别图片并生成中…' : '正在生成回复…',
      canSend: false,
      sendDisabled: true
    }, function () {
      this.persistWorkspaceDraft();
      this.scrollChatToBottom();
    }.bind(this));

    var that = this;
    var streamText = '';
    var streamTask = agentChat.sendChatStream({
      message: apiMessage,
      attachments: attachmentsToUploadPayload(attachments),
      messages: conversationHistory,
      templateId: templateId
    }, {
      onStatus: function (status) {
        if (!status || !status.label) return;
        that.setData({ sendingStageLabel: status.label });
      },
      onDelta: function (payload) {
        var chunk = String((payload && payload.content) || '');
        if (!chunk) return;
        streamText += chunk;
        that.setData({
          sendingStageLabel: '',
          messages: updateMessageById(that.data.messages, streamMessage.id, {
            status: 'streaming',
            streamingText: streamText
          })
        }, that.scrollChatToBottom.bind(that));
      },
      onDone: function (payload) {
        that.setData({ activeStreamTask: null });
        var finalResult = (payload && payload.finalResult) || payload || {};
        that.finishStreamResponse(streamMessage.id, finalResult, payload);
      },
      onError: function (err) {
        that.setData({ activeStreamTask: null });
        that.handleStreamError(streamMessage.id, err);
      },
      onComplete: function () {
        that.setData({ activeStreamTask: null });
      }
    });

    this.setData({ activeStreamTask: streamTask });
  },

  finishStreamResponse: function (messageId, finalResult, payload) {
    if (finalResult.type === 'template' && finalResult.templateDraft) {
      var draft = finalResult.templateDraft;
      this.setData({
        sending: false,
        sendingStageLabel: '',
        streamingMessageId: '',
        messages: updateMessageById(this.data.messages, messageId, {
          status: 'complete',
          content: '已生成模板草稿：' + (draft.name || '未命名'),
          bodyText: '',
          streamingText: '',
          templateDraft: draft,
          resultType: 'template',
          chatContent: [{ type: 'text', data: '已生成模板草稿：' + (draft.name || '未命名') }]
        })
      }, function () {
        this.refreshSendState();
        this.scrollChatToBottom();
      }.bind(this));
      return;
    }

    var bodyText = finalResult.bodyText || finalResult.resultText || '';
    var streamingMessage = (this.data.messages || []).find(function (item) { return item.id === messageId; });
    var request = streamingMessage && streamingMessage.request || {};
    if (request.applyToDocumentId) {
      var nextConfirmItems = Array.isArray(finalResult.confirmItems)
        ? finalResult.confirmItems.map(function (text) { return { text: text, checked: false }; })
        : [];
      this.setData({
        sending: false,
        sendingStageLabel: '',
        streamingMessageId: '',
        messages: (this.data.messages || []).filter(function (item) {
          return item.id !== messageId && !(item.isRevisionRequest && item.revisionTargetId === request.applyToDocumentId);
        }).map(function (item) {
          if (item.id !== request.applyToDocumentId) return item;
          return Object.assign({}, item, {
            bodyText: bodyText,
            resultText: finalResult.resultText || bodyText,
            content: bodyText,
            chatContent: buildChatContentParts(bodyText, item.thinkingText || ''),
            confirmItems: nextConfirmItems,
            revisedAt: Date.now(),
            isDocument: true
          });
        })
      }, function () {
        this.refreshSendState();
        this.scrollChatToBottom();
        wx.showToast({ title: '文书已更新', icon: 'success' });
      }.bind(this));
      return;
    }
    this.setData({
      sending: false,
      sendingStageLabel: '',
      streamingMessageId: '',
      messages: updateMessageById(this.data.messages, messageId, {
        status: 'complete',
        resultText: finalResult.resultText || bodyText,
        bodyText: bodyText,
        streamingText: '',
        resultType: 'text',
        isDocument: Boolean(request.forceDocument) || shouldRenderDocument({ bodyText: bodyText }, request.templateId || this.data.selectedTemplateId),
        confirmItems: Array.isArray(finalResult.confirmItems) ? finalResult.confirmItems.map(function (text) { return { text: text, checked: false }; }) : []
      })
    }, function () {
      this.refreshSendState();
      this.scrollChatToBottom();
    }.bind(this));
  },

  handleStreamError: function (messageId, err) {
    if (this.data.cancelledMessageId === messageId) {
      this.setData({ cancelledMessageId: '' });
      return;
    }
    var errorMessage = (err && err.message) || '服务暂时不可用';
    var failedMessage = (this.data.messages || []).find(function (item) { return item.id === messageId; });
    var failedRequest = failedMessage && failedMessage.request || {};
    if (failedRequest.applyToDocumentId) {
      this.setData({
        messages: (this.data.messages || []).filter(function (item) {
          return item.id !== messageId && !(item.isRevisionRequest && item.revisionTargetId === failedRequest.applyToDocumentId);
        }),
        sending: false,
        sendingStageLabel: '',
        streamingMessageId: ''
      }, function () {
        this.refreshSendState();
        wx.showToast({ title: '修订失败，原文书未变更', icon: 'none' });
      }.bind(this));
      return;
    }
    this.setData({
      messages: updateMessageById(this.data.messages, messageId, {
        status: 'error',
        errorMessage: errorMessage,
        content: '生成失败',
        streamingText: ''
      }),
      sending: false,
      sendingStageLabel: '',
      streamingMessageId: ''
    }, function () {
      this.refreshSendState();
      this.scrollChatToBottom();
      wx.showToast({ title: errorMessage, icon: 'none' });
    }.bind(this));
  },

  finishAssistantMessage: function (assistantMessage) {
    this.setData({
      sending: false,
      sendingStageLabel: '',
      messages: this.data.messages.concat(assistantMessage)
    }, function () {
      this.refreshSendState();
      this.scrollChatToBottom();
    }.bind(this));
  },

  appendAttachmentsFromPaths: function (paths) {
    if (!paths || !paths.length) return;

    var that = this;
    var current = (this.data.pendingAttachments || []).slice();
    var remaining = MAX_PENDING_IMAGES - current.length;
    if (remaining <= 0) {
      wx.showToast({ title: '最多添加 ' + MAX_PENDING_IMAGES + ' 张图片', icon: 'none' });
      return;
    }

    var selectedPaths = paths.slice(0, remaining);
    var placeholders = selectedPaths.map(function (path) {
      return createAttachmentPlaceholder(path);
    });

    that.setPendingAttachments(current.concat(placeholders), that.refreshSendState.bind(that));

    placeholders.forEach(function (placeholder) {
      buildAttachmentFromPath(placeholder.previewUrl, placeholder.id).then(function (ready) {
        var next = replaceAttachmentById(that.data.pendingAttachments, placeholder.id, ready);
        that.setPendingAttachments(next, that.refreshSendState.bind(that));
      }).catch(function () {
        var next = replaceAttachmentById(that.data.pendingAttachments, placeholder.id, Object.assign({}, placeholder, {
          ocrStatus: 'failed',
          upload: null
        }));
        that.setPendingAttachments(next, that.refreshSendState.bind(that));
        wx.showToast({ title: '图片处理失败，请重试', icon: 'none' });
      });
    });
  },

  onRemovePendingImage: function (e) {
    var id = e.currentTarget.dataset.id;
    var next = (this.data.pendingAttachments || []).filter(function (item) {
      return item.id !== id;
    });
    this.setPendingAttachments(next, this.refreshSendState.bind(this));
  },

  retryPendingImage: function (e) {
    var id = e.currentTarget.dataset.id;
    var target = (this.data.pendingAttachments || []).find(function (item) { return item.id === id; });
    if (!target || !target.previewUrl) return;
    var that = this;
    that.setPendingAttachments(replaceAttachmentById(that.data.pendingAttachments, id, Object.assign({}, target, {
      ocrStatus: 'recognizing', upload: null
    })), that.refreshSendState.bind(that));
    buildAttachmentFromPath(target.previewUrl, id).then(function (ready) {
      that.setPendingAttachments(replaceAttachmentById(that.data.pendingAttachments, id, ready), that.refreshSendState.bind(that));
    }).catch(function () {
      that.setPendingAttachments(replaceAttachmentById(that.data.pendingAttachments, id, Object.assign({}, target, {
        ocrStatus: 'failed', upload: null
      })), that.refreshSendState.bind(that));
    });
  },

  previewPendingImage: function (e) {
    var url = e.currentTarget.dataset.url;
    var urls = (this.data.pendingPreviewItems || []).map(function (item) { return item.url; });
    if (!url || !urls.length) return;
    wx.previewImage({ current: url, urls: urls });
  },

  previewSentImage: function (e) {
    var url = e.currentTarget.dataset.url;
    if (!url) return;
    wx.previewImage({ current: url, urls: [url] });
  },

  goImage: function () {
    var that = this;
    featureEntitlements.guardAiFeature('ocr', '图片识别').then(function (ok) {
      if (!ok) return;
      var remaining = MAX_PENDING_IMAGES - (that.data.pendingAttachments || []).length;
      if (remaining <= 0) {
        wx.showToast({ title: '最多添加 ' + MAX_PENDING_IMAGES + ' 张图片', icon: 'none' });
        return;
      }
      wx.chooseImage({
        count: remaining,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: function (res) {
          that.appendAttachmentsFromPaths(res.tempFilePaths || []);
        }
      });
    });
  },

  goVoice: function () {
    featureEntitlements.guardAiFeature('asr', '语音转写').then(function (ok) {
      if (!ok) return;
      wx.navigateTo({ url: '/pages/asr/index?returnTo=ai' });
    });
  },

  consumeMediaInputDraft: function () {
    var draft = wx.getStorageSync(AI_MEDIA_INPUT_DRAFT_KEY);
    if (!draft || !draft.text) return;
    wx.removeStorageSync(AI_MEDIA_INPUT_DRAFT_KEY);
    var current = String(this.data.inputText || '').trim();
    var incoming = String(draft.text || '').trim();
    this.setData({
      inputText: current ? current + '\n' + incoming : incoming
    }, this.refreshSendState.bind(this));
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

  copyResult: function (e) {
    var latest = this.data.messages.find(function (message) { return message.id === e.currentTarget.dataset.id; });
    var text = String(latest && latest.bodyText || '').trim();
    if (!text) return;
    wx.setClipboardData({ data: text, success: function () { wx.showToast({ title: '已复制', icon: 'success' }); } });
  },

  editResult: function (e) {
    var latest = this.data.messages.find(function (message) { return message.id === e.currentTarget.dataset.id; });
    var text = String(latest && latest.bodyText || '').trim();
    if (!text) return;
    this.setData({ inputText: text }, this.refreshSendState.bind(this));
  },

  openConfirmEditor: function (e) {
    var messageId = e.currentTarget.dataset.id;
    var itemIndex = Number(e.currentTarget.dataset.index);
    var message = (this.data.messages || []).find(function (item) { return item.id === messageId; });
    var confirm = message && (message.confirmItems || [])[itemIndex];
    if (!confirm) return;
    this.setData({
      confirmEditorVisible: true,
      confirmEditorMessageId: messageId,
      confirmEditorIndex: itemIndex,
      confirmEditorTitle: '核实并修订',
      confirmEditorHint: confirm.text,
      confirmEditorText: ''
    });
  },

  openDocumentRevision: function (e) {
    this.setData({
      confirmEditorVisible: true,
      confirmEditorMessageId: e.currentTarget.dataset.id,
      confirmEditorIndex: -1,
      confirmEditorTitle: '修订当前文书',
      confirmEditorHint: '输入需要修改、补充或删除的内容',
      confirmEditorText: ''
    });
  },

  closeConfirmEditor: function () {
    this.setData({ confirmEditorVisible: false, confirmEditorText: '' });
  },

  onConfirmEditorInput: function (e) {
    this.setData({ confirmEditorText: e.detail.value || '' });
  },

  applyDocumentRevision: function () {
    var messageId = this.data.confirmEditorMessageId;
    var itemIndex = this.data.confirmEditorIndex;
    var revision = String(this.data.confirmEditorText || '').trim();
    var documentMessage = (this.data.messages || []).find(function (item) { return item.id === messageId; });
    if (!documentMessage || !documentMessage.bodyText) return;
    if (!revision) {
      wx.showToast({ title: '请填写补充或修订内容', icon: 'none' });
      return;
    }
    var confirm = itemIndex >= 0 ? (documentMessage.confirmItems || [])[itemIndex] : null;
    var instruction = [
      '请基于以下当前文书完成修订，只输出完整的修订后文书，不要解释过程。',
      '',
      '【当前文书】',
      documentMessage.bodyText,
      '',
      confirm ? '【待确认项】' : '【修订要求】',
      confirm ? confirm.text : '',
      '【用户补充/修订】',
      revision,
      '',
      '用户表示无、未知或未提供的信息，请在文书中如实标注或删除对应推断，不要再次追问。保留仍未核实的事项。'
    ].filter(function (line, index) {
      return line || index !== 6;
    }).join('\n');
    this.setData({ confirmEditorVisible: false, confirmEditorText: '' });
    this.sendMessage({
      message: instruction,
      attachments: [],
      applyToDocumentId: messageId,
      forceDocument: true,
      templateId: documentMessage.request && documentMessage.request.templateId || this.data.selectedTemplateId || ''
    });
  },

  restoreFailedRequest: function (e) {
    var latest = this.data.messages.find(function (message) { return message.id === e.currentTarget.dataset.id; });
    var request = latest && latest.request;
    if (!request) return;
    if (request.applyToDocumentId) {
      wx.showToast({ title: '原文书未变更，请重新提交修订', icon: 'none' });
      return;
    }
    this.setData({
      inputText: request.restoreMessage !== undefined ? request.restoreMessage : (request.message || ''),
      pendingAttachments: request.attachments || [],
      pendingPreviewItems: attachmentsToPreviewItems(request.attachments || [])
    }, function () {
      this.persistWorkspaceDraft();
      this.refreshSendState();
    }.bind(this));
  },

  stopGeneration: function () {
    if (!this.data.sending) return;
    var messageId = this.data.streamingMessageId;
    var task = this.data.activeStreamTask;
    // Mark the request as intentionally cancelled before aborting it, so its fail callback cannot render an error card.
    this.setData({ cancelledMessageId: messageId });
    if (task && typeof task.abort === 'function') task.abort();
    var current = (this.data.messages || []).find(function (item) { return item.id === messageId; });
    var request = current && current.request || {};
    if (request.applyToDocumentId) {
      this.setData({
        activeStreamTask: null,
        sending: false,
        sendingStageLabel: '',
        streamingMessageId: '',
        messages: (this.data.messages || []).filter(function (item) {
          return item.id !== messageId && !(item.isRevisionRequest && item.revisionTargetId === request.applyToDocumentId);
        })
      }, function () {
        this.refreshSendState();
        wx.showToast({ title: '已停止修订，原文书未变更', icon: 'none' });
      }.bind(this));
      return;
    }
    var partialText = String(current && current.streamingText || '').trim();
    this.setData({
      activeStreamTask: null,
      sending: false,
      sendingStageLabel: '',
      streamingMessageId: '',
      messages: updateMessageById(this.data.messages, messageId, {
        status: partialText ? 'complete' : 'stopped',
        bodyText: partialText,
        streamingText: '',
        content: partialText || '已停止生成',
        isPartial: Boolean(partialText),
        isDocument: shouldRenderDocument({ bodyText: partialText }, this.data.selectedTemplateId)
      })
    }, this.refreshSendState.bind(this));
  },

  fillQuickPrompt: function (e) {
    this.setData({ inputText: e.currentTarget.dataset.prompt || '' }, this.refreshSendState.bind(this));
  },

  saveTemplateDraft: function (e) {
    var id = e.currentTarget.dataset.id;
    var latest = this.data.messages.find(function (message) { return message.id === id; });
    if (!latest || !latest.templateDraft) return;
    var catalog = require('../../services/templates/catalog');
    catalog.saveTemplate(latest.templateDraft).then(function () {
      wx.showToast({ title: '模板已保存', icon: 'success' });
    }).catch(function (err) {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    });
  },

  resetSession: function () {
    if (this.data.sending) {
      wx.showModal({
        title: '结束当前生成？',
        content: '正在生成的内容会停止，本页对话将清除。',
        confirmText: '结束并新建',
        success: function (res) {
          if (!res.confirm) return;
          var task = this.data.activeStreamTask;
          if (task && typeof task.abort === 'function') task.abort();
          this.clearSession();
        }.bind(this)
      });
      return;
    }
    if (this.data.messages.length) {
      wx.showModal({
        title: '新建对话',
        content: '当前对话会从本页清除。',
        success: function (res) {
          if (res.confirm) this.clearSession();
        }.bind(this)
      });
      return;
    }
    this.clearSession();
  },

  clearSession: function () {
    var task = this.data.activeStreamTask;
    if (task && typeof task.abort === 'function') {
      task.abort();
    }
    this.setData({
      messages: [],
      inputText: '',
      pendingAttachments: [],
      pendingPreviewItems: [],
      sending: false,
      sendingStageLabel: '',
      streamingMessageId: '',
      activeStreamTask: null,
      cancelledMessageId: '',
      templateGuideAfterMessageId: ''
    }, function () {
      this.persistWorkspaceDraft();
      this.refreshSendState();
    }.bind(this));
  },

  onUnload: function () {
    var task = this.data.activeStreamTask;
    if (task && typeof task.abort === 'function') {
      task.abort();
    }
  }
});
