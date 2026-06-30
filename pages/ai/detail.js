var agentChat = require('../../services/agent/chat');
var agentText = require('../../services/agent/text');
var templateCatalog = require('../../services/templates/catalog');
var featureEntitlements = require('../../services/entitlements/features');
var draftService = require('../../services/content/draft');
var tabBarNav = require('../../services/navigation/tab-bar');
var ocrRecognizer = require('../../services/ocr/recognizer');

var AI_MEDIA_INPUT_DRAFT_KEY = 'aiMediaInputDraft';
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
    pendingAttachments: [],
    pendingPreviewItems: [],
    maxPendingImages: MAX_PENDING_IMAGES,
    canSend: false,
    sendDisabled: true,
    isProfessionalWorkspace: false,
    sendingStageLabel: '',
    streamingMessageId: '',
    recognizingAttachments: false,
    activeStreamTask: null
  },

  onLoad: function (options) {
    if (!featureEntitlements.guardAiFeature('aiWriting', '智能创作')) {
      wx.navigateBack({ fail: function () { wx.reLaunch({ url: '/pages/home/home' }); } });
      return;
    }
    var initialText = options && options.text ? decodeURIComponent(options.text) : '';
    this.setData({ inputText: initialText });
    this.consumeMediaInputDraft();
    this.prepareWorkspace();
  },

  onShow: function () {
    tabBarNav.syncTabBar(this, 'pages/ai/detail');
    this.consumeMediaInputDraft();
    this.prepareWorkspace();
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
    this.setData({ isProfessionalWorkspace: featureEntitlements.hasDeviceSession() });

    agentText.listTemplates().then(function (templates) {
      if (!that.data.isProfessionalWorkspace) {
        templates = templates.filter(function (item) {
          return !(item.audience === 'professional' && item.tag === 'official');
        });
      }
      that.applyTemplateList(templates);
    }).catch(function () {
      templateCatalog.listTemplates().then(function (result) {
        var templates = (result && result.templates) || [];
        if (!that.data.isProfessionalWorkspace) {
          templates = templates.filter(function (item) {
            return !(item.audience === 'professional' && item.tag === 'official');
          });
        }
        that.applyTemplateList(templates);
      }).catch(function () {
        that.applyTemplateList([]);
      });
    });

    this.refreshSendState();
  },

  applyTemplateList: function (templates) {
    templates = templates || [];
    var names = templates.map(function (item) { return item.name; });
    var selectedId = wx.getStorageSync('selectedTemplateId') || '';
    var selectedIndex = 0;
    var selectedTemplateId = '';
    var templateLabel = '选择模板（可选）';
    var selectedTemplateName = '';

    if (selectedId) {
      wx.removeStorageSync('selectedTemplateId');
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

    this.setData({
      templates: templates,
      templateNames: names,
      selectedTemplateIndex: selectedIndex,
      selectedTemplateId: selectedTemplateId,
      selectedTemplateName: selectedTemplateName,
      templateLabel: templateLabel
    });
  },

  openTemplatePicker: function () {
    if (!featureEntitlements.guardAiFeature('templates', '场景模板')) return;
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
    this.setData({
      selectedTemplateIndex: index,
      selectedTemplateId: selected ? selected.id : '',
      selectedTemplateName: selected ? selected.name : '',
      templateLabel: selected ? ('已选：' + selected.name) : '选择模板（可选）'
    });
  },

  clearTemplateSelection: function () {
    this.setData({
      selectedTemplateIndex: 0,
      selectedTemplateId: '',
      selectedTemplateName: '',
      templateLabel: '选择模板（可选）'
    });
  },

  goTemplateImport: function () {
    if (!featureEntitlements.guardAiFeature('templates', '场景模板')) return;
    wx.navigateTo({ url: '/pages/ai/template-import' });
  },

  onInput: function (e) {
    var text = (e.detail && e.detail.value !== undefined) ? e.detail.value : '';
    this.setData({ inputText: text }, this.refreshSendState.bind(this));
  },

  refreshSendState: function () {
    var hasText = String(this.data.inputText || '').trim().length > 0;
    var attachments = this.data.pendingAttachments || [];
    var hasAttachment = attachments.length > 0;
    var recognizing = hasRecognizingAttachment(attachments);
    var canSend = (hasText || hasAttachment) && !this.data.sending && !recognizing;
    this.setData({ canSend: canSend, sendDisabled: !canSend, recognizingAttachments: recognizing });
  },

  sendMessage: function () {
    if (!this.data.canSend || this.data.sending) return;

    var message = String(this.data.inputText || '').trim();
    var attachments = (this.data.pendingAttachments || []).slice();
    if (!message && !attachments.length) return;

    var userMessage = createMessage('user', message, {
      chatContent: buildUserChatContent(message, attachments),
      rawAttachments: attachments
    });

    var streamMessage = createMessage('assistant', '', {
      status: 'pending',
      streamingText: '',
      bodyText: '',
      resultType: 'text'
    });

    var needsServerOcr = attachments.some(function (item) {
      return !String(item.ocrText || '').trim();
    });

    this.setData({
      messages: this.data.messages.concat(userMessage, streamMessage),
      inputText: '',
      pendingAttachments: [],
      pendingPreviewItems: [],
      sending: true,
      streamingMessageId: streamMessage.id,
      sendingStageLabel: needsServerOcr ? '识别图片并生成中…' : '正在生成回复…',
      canSend: false,
      sendDisabled: true
    }, this.scrollChatToBottom.bind(this));

    var that = this;
    var streamText = '';
    var streamTask = agentChat.sendChatStream({
      message: message,
      attachments: attachmentsToUploadPayload(attachments),
      messages: [],
      templateId: this.data.selectedTemplateId || ''
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
    this.setData({
      sending: false,
      sendingStageLabel: '',
      streamingMessageId: '',
      messages: updateMessageById(this.data.messages, messageId, {
        status: 'complete',
        resultText: finalResult.resultText || bodyText,
        bodyText: bodyText,
        streamingText: '',
        resultType: 'text'
      })
    }, function () {
      this.refreshSendState();
      this.scrollChatToBottom();
    }.bind(this));
  },

  handleStreamError: function (messageId, err) {
    var errorMessage = (err && err.message) || '服务暂时不可用';
    var messages = (this.data.messages || []).filter(function (item) {
      return item.id !== messageId;
    });
    this.setData({
      messages: messages,
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
          ocrStatus: 'done',
          upload: {
            type: 'image',
            data: '',
            mimeType: 'image/jpeg'
          }
        }));
        that.setPendingAttachments(next, that.refreshSendState.bind(that));
        wx.showToast({ title: '图片识别失败', icon: 'none' });
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

  previewPendingImage: function (e) {
    var url = e.currentTarget.dataset.url;
    var urls = (this.data.pendingPreviewItems || []).map(function (item) { return item.url; });
    if (!url || !urls.length) return;
    wx.previewImage({ current: url, urls: urls });
  },

  goImage: function () {
    if (!featureEntitlements.guardAiFeature('ocr', '图片识别')) return;
    var remaining = MAX_PENDING_IMAGES - (this.data.pendingAttachments || []).length;
    if (remaining <= 0) {
      wx.showToast({ title: '最多添加 ' + MAX_PENDING_IMAGES + ' 张图片', icon: 'none' });
      return;
    }
    var that = this;
    wx.chooseImage({
      count: remaining,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        that.appendAttachmentsFromPaths(res.tempFilePaths || []);
      }
    });
  },

  goVoice: function () {
    if (!featureEntitlements.guardAiFeature('asr', '语音转写')) return;
    wx.navigateTo({ url: '/pages/asr/index?returnTo=ai&auto=1' });
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
      activeStreamTask: null
    }, this.refreshSendState.bind(this));
  },

  onUnload: function () {
    var task = this.data.activeStreamTask;
    if (task && typeof task.abort === 'function') {
      task.abort();
    }
  }
});
