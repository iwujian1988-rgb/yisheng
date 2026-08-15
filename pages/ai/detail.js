var agentChat = require('../../services/agent/chat');
var agentText = require('../../services/agent/text');
var deviceSession = require('../../services/device/session');
var bleLink = require('../../services/device/ble-link');
var liveHeartbeat = require('../../services/device/live-heartbeat');
var featureEntitlements = require('../../services/entitlements/features');
var draftService = require('../../services/content/draft');
var tabBarNav = require('../../services/navigation/tab-bar');
var ocrRecognizer = require('../../services/ocr/recognizer');
var templateFieldMaterial = require('../../services/templates/field-material');

var AI_MEDIA_INPUT_DRAFT_KEY = 'aiMediaInputDraft';
var AI_WORKSPACE_DRAFT_KEY = 'aiWorkspaceDraftV1';
var MAX_PENDING_IMAGES = 3;
var COMPRESS_QUALITY = 70;
var COMPRESS_MAX_WIDTH = 1280;

function createDocumentContextId() {
  return 'doc-' + Date.now() + '-' + Math.floor(Math.random() * 1000000);
}

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

function buildTemplateGuideState(template, expanded, fieldValues) {
  var fields = collectTemplateGuideFields(template && template.fields);
  var values = fieldValues || {};
  fields = fields.map(function (item) {
    var value = String(values[item.label] || '').trim();
    return Object.assign({}, item, { value: value, filled: Boolean(value) });
  });
  var prioritized = fields.filter(function (item) { return item.required; }).concat(
    fields.filter(function (item) { return !item.required; })
  );
  var limit = expanded ? 16 : 8;
  return {
    selectedTemplate: template || null,
    templateGuideFields: fields,
    visibleTemplateGuideFields: prioritized.slice(0, limit),
    templateGuideExpanded: Boolean(expanded),
    templateGuideHiddenCount: Math.max(0, prioritized.length - limit),
    templateFieldFilledCount: templateFieldMaterial.countFilledFields(fields),
    templateStructureText: prioritized.slice(0, 5).map(function (item) { return item.label; }).join('、') || '由模板自动确定',
    templateStructureFullText: prioritized.map(function (item) { return item.label; }).join('、') || '由模板自动确定'
  };
}

function normalizeDetailLevel(value) {
  return ['concise', 'standard', 'detailed'].indexOf(value) >= 0 ? value : 'standard';
}

function stripEmptyTemplateFields(text, fields) {
  var labels = (fields || []).map(function (item) {
    return String(item && item.label || '').trim();
  }).filter(Boolean);
  return String(text || '').split(/\r?\n/).filter(function (line) {
    var value = String(line || '').trim();
    if (!value) return true;
    return !labels.some(function (label) {
      return value === label || value === label + '：' || value === label + ':';
    });
  }).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function buildVoiceMaterialText(voiceMaterials) {
  return (voiceMaterials || []).map(function (item, index) {
    var text = String(item && item.text || '').trim();
    return text ? '【录音转写 ' + (index + 1) + '】\n' + text : '';
  }).filter(Boolean).join('\n\n');
}

function combineInputMaterials(inputText, voiceMaterials) {
  return [String(inputText || '').trim(), buildVoiceMaterialText(voiceMaterials)].filter(Boolean).join('\n\n');
}

function buildMaterialSummary(inputText, attachments, voiceMaterials, fields) {
  var textLength = String(inputText || '').trim().length;
  var voiceItems = voiceMaterials || [];
  var voiceChars = voiceItems.reduce(function (total, item) { return total + String(item && item.text || '').trim().length; }, 0);
  var images = attachments || [];
  var ocrChars = images.reduce(function (total, item) {
    return total + String(item && item.ocrText || '').trim().length;
  }, 0);
  var recognizing = images.filter(function (item) { return item.ocrStatus === 'recognizing'; }).length;
  var parts = [];
  var filledFields = templateFieldMaterial.countFilledFields(fields);
  if (filledFields) parts.push('已填字段 ' + filledFields + '项');
  if (images.length) parts.push('OCR ' + images.length + '张' + (ocrChars ? '（' + ocrChars + '字）' : ''));
  if (voiceChars) parts.push('录音 ' + voiceItems.length + '条（' + voiceChars + '字）');
  if (textLength) parts.push('输入文字 ' + textLength + '字');
  if (recognizing) parts.push('正在识别 ' + recognizing + '张');
  return {
    materialSummaryText: parts.length ? parts.join(' · ') : '还没有添加材料',
    materialReady: Boolean(textLength || voiceChars || images.length || filledFields),
    materialRecognizing: recognizing > 0
  };
}

function buildTemplateConfirmPreview(inputText, attachments, voiceMaterials, fields) {
  var text = String(inputText || '').trim();
  var parts = [];
  if (text) {
    parts.push('【输入文字】\n' + text);
  }
  var voiceText = buildVoiceMaterialText(voiceMaterials);
  if (voiceText) parts.push(voiceText);
  var fieldText = templateFieldMaterial.buildFieldMaterial(fields);
  if (fieldText) parts.push('【已填模板字段】\n' + fieldText);
  (attachments || []).forEach(function (item, index) {
    var ocrText = String(item && item.ocrText || '').trim();
    parts.push('【图片 ' + (index + 1) + ' 识别文字】\n' + (ocrText || '尚未提取到文字，将在生成时处理图片内容'));
  });
  return parts.join('\n\n') || '还没有可用于生成的材料';
}

function hasFailedAttachment(attachments) {
  return (attachments || []).some(function (item) {
    return item.ocrStatus === 'failed';
  });
}

function shouldRenderDocument(message, selectedTemplateId) {
  var text = String(message && (message.bodyText || message.streamingText || message.content) || '');
  return Boolean(selectedTemplateId) || text.length >= 360 || /【正文】|正文[：:]/.test(text);
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
    templateFieldsPanelVisible: false,
    templateFieldChoicesVisible: false,
    templateStructureExpanded: false,
    composerMoreVisible: false,
    templateFieldValues: {},
    templateFieldFilledCount: 0,
    templateFieldEditorVisible: false,
    templateFieldEditorLabel: '',
    templateFieldEditorValue: '',
    templateConfirmVisible: false,
    templateConfirmPreview: '',
    templateConfirmSources: '',
    templateConfirmImages: [],
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
    confirmEditorMode: 'ai',
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
    cancelledMessageId: '',
    composerBottomStyle: '',
    pendingVoiceMaterials: [],
    materialSummaryText: '还没有添加材料',
    materialReady: false,
    materialRecognizing: false,
    materialFeedbackText: '',
    documentTaskStartIndex: 0,
    documentContextId: '',
    detailLevel: 'standard',
    detailLevelLabel: '标准',
    detailLevelOptions: [
      { value: 'concise', label: '简洁', hint: '保留核心信息' },
      { value: 'standard', label: '标准', hint: '结构完整，便于核对' },
      { value: 'detailed', label: '详细', hint: '在不增加事实的前提下充分展开' }
    ],
    templateStructureText: '由模板自动确定',
    templateStructureFullText: '由模板自动确定',
    chatBottomStyle: ''
  },

  onLoad: function (options) {
    var that = this;
    this._keyboardHeightHandler = function (res) {
      var height = Math.max(0, Number(res && res.height || 0));
      that.setData({ composerBottomStyle: height ? ('bottom:' + height + 'px;') : '' });
    };
    if (wx.onKeyboardHeightChange) wx.onKeyboardHeightChange(this._keyboardHeightHandler);
    featureEntitlements.guardAiFeature('aiWriting', '智能创作').then(function (ok) {
      if (!ok) {
        wx.navigateBack({ fail: function () { wx.reLaunch({ url: '/pages/home/home' }); } });
        return;
      }
      var initialText = options && options.text ? decodeURIComponent(options.text) : '';
      var workspaceDraft = wx.getStorageSync(AI_WORKSPACE_DRAFT_KEY) || {};
      that.setData({
        inputText: initialText || workspaceDraft.inputText || '',
        pendingVoiceMaterials: Array.isArray(workspaceDraft.voiceMaterials) ? workspaceDraft.voiceMaterials : [],
        templateFieldValues: workspaceDraft.templateFieldValues || {},
        detailLevel: normalizeDetailLevel(workspaceDraft.detailLevel),
        detailLevelLabel: ({ concise: '简洁', standard: '标准', detailed: '详细' })[normalizeDetailLevel(workspaceDraft.detailLevel)],
        documentContextId: createDocumentContextId()
      });
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

  syncComposerLayout: function () {
    var that = this;
    if (this._composerLayoutTimer) clearTimeout(this._composerLayoutTimer);
    this._composerLayoutTimer = setTimeout(function () {
      wx.createSelectorQuery().in(that).select('.detail-composer').boundingClientRect(function (rect) {
        if (!rect || !rect.height) return;
        that.setData({ chatBottomStyle: 'bottom:calc(' + Math.ceil(rect.height) + 'px + var(--app-tab-bar-height, 100rpx));' });
      }).exec();
    }, 30);
  },

  setPendingAttachments: function (attachments, callback) {
    this.setData({
      pendingAttachments: attachments,
      pendingPreviewItems: attachmentsToPreviewItems(attachments)
    }, function () {
      this.refreshMaterialSummary();
      this.syncComposerLayout();
      if (callback) callback();
    }.bind(this));
  },

  refreshMaterialSummary: function () {
    this.setData(buildMaterialSummary(
      this.data.inputText,
      this.data.pendingAttachments,
      this.data.pendingVoiceMaterials,
      this.data.templateGuideFields
    ));
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
    this.setData(Object.assign({
      templates: templates,
      templateNames: names,
      selectedTemplateIndex: selectedIndex,
      selectedTemplateId: selectedTemplateId,
      selectedTemplateName: selectedTemplateName,
      templateLabel: templateLabel,
      templatePickerItems: this.buildTemplatePickerItems(templates, '')
    }, buildTemplateGuideState(selectedTemplate, false, this.data.templateFieldValues)), function () {
      this.persistWorkspaceDraft();
      this.refreshSendState();
      this.syncComposerLayout();
    }.bind(this));
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
        composerMoreVisible: false,
        templateFieldsPanelVisible: false,
        templateFieldChoicesVisible: false,
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
      templateFieldsPanelVisible: false,
      templateFieldChoicesVisible: false,
      templateFieldValues: {},
      templateFieldFilledCount: 0,
      documentTaskStartIndex: (this.data.messages || []).length
    }, buildTemplateGuideState(selected, false, {})), function () {
      this.persistWorkspaceDraft();
      this.refreshMaterialSummary();
      this.setData({
        materialFeedbackText: selected
          ? (this.data.materialReady
            ? '当前已有材料和后续添加内容都会用于生成“' + selected.name + '”'
            : '接下来添加的文字、录音和 OCR 都会用于生成“' + selected.name + '”')
          : ''
      });
      this.scrollChatToBottom();
      this.syncComposerLayout();
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
      templateConfirmSources: '',
      templateConfirmImages: [],
      templateFieldsPanelVisible: false,
      templateFieldChoicesVisible: false,
      templateFieldValues: {},
      templateFieldFilledCount: 0,
      documentTaskStartIndex: (this.data.messages || []).length
    }, buildTemplateGuideState(null, false, {})), function () {
      this.persistWorkspaceDraft();
      this.syncComposerLayout();
    }.bind(this));
  },

  toggleTemplateGuide: function () {
    var selected = this.data.selectedTemplate;
    if (!selected) return;
    this.setData(buildTemplateGuideState(selected, !this.data.templateGuideExpanded, this.data.templateFieldValues), this.syncComposerLayout.bind(this));
  },

  toggleTemplateFieldsPanel: function () {
    var visible = !this.data.templateFieldsPanelVisible;
    this.setData({
      templateFieldsPanelVisible: visible,
      templateFieldChoicesVisible: visible ? this.data.templateFieldChoicesVisible : false,
      templateStructureExpanded: visible ? this.data.templateStructureExpanded : false
    }, this.syncComposerLayout.bind(this));
  },

  toggleComposerMorePanel: function () {
    if (wx.hideKeyboard) wx.hideKeyboard({ fail: function () {} });
    var visible = !this.data.composerMoreVisible;
    this.setData({
      composerMoreVisible: visible,
      templateFieldsPanelVisible: false,
      templateFieldChoicesVisible: false,
      templateStructureExpanded: false,
      composerBottomStyle: ''
    }, this.syncComposerLayout.bind(this));
  },

  openTemplateToolsPanel: function () {
    if (!this.data.selectedTemplateId) {
      this.openTemplatePicker();
      return;
    }
    if (wx.hideKeyboard) wx.hideKeyboard({ fail: function () {} });
    this.setData({
      composerMoreVisible: false,
      templateFieldsPanelVisible: true,
      composerBottomStyle: ''
    }, this.syncComposerLayout.bind(this));
  },

  backToComposerMorePanel: function () {
    this.setData({
      composerMoreVisible: true,
      templateFieldsPanelVisible: false,
      templateFieldChoicesVisible: false,
      templateStructureExpanded: false
    }, this.syncComposerLayout.bind(this));
  },

  closeComposerPanels: function () {
    if (!this.data.composerMoreVisible && !this.data.templateFieldsPanelVisible) return;
    this.setData({
      composerMoreVisible: false,
      templateFieldsPanelVisible: false,
      templateFieldChoicesVisible: false,
      templateStructureExpanded: false
    }, this.syncComposerLayout.bind(this));
  },

  toggleTemplateFieldChoices: function () {
    this.setData({ templateFieldChoicesVisible: !this.data.templateFieldChoicesVisible }, this.syncComposerLayout.bind(this));
  },

  toggleTemplateStructure: function () {
    this.setData({ templateStructureExpanded: !this.data.templateStructureExpanded }, this.syncComposerLayout.bind(this));
  },

  finishTemplateFields: function () {
    this.setData({
      composerMoreVisible: false,
      templateFieldsPanelVisible: false,
      templateFieldChoicesVisible: false,
      templateStructureExpanded: false
    }, this.syncComposerLayout.bind(this));
  },

  openTemplateFieldEditor: function (e) {
    var label = String(e.currentTarget.dataset.label || '').trim();
    if (!label) return;
    this.setData({
      templateFieldEditorVisible: true,
      templateFieldEditorLabel: label,
      templateFieldEditorValue: String((this.data.templateFieldValues || {})[label] || '')
    });
  },

  closeTemplateFieldEditor: function () {
    if (wx.hideKeyboard) wx.hideKeyboard();
    this.setData({
      templateFieldEditorVisible: false,
      templateFieldEditorLabel: '',
      templateFieldEditorValue: '',
      templateFieldsPanelVisible: true,
      templateFieldChoicesVisible: true
    }, this.syncComposerLayout.bind(this));
  },

  onTemplateFieldEditorInput: function (e) {
    this.setData({ templateFieldEditorValue: e.detail && e.detail.value || '' });
  },

  saveTemplateFieldValue: function () {
    var label = String(this.data.templateFieldEditorLabel || '').trim();
    if (!label) return;
    var values = Object.assign({}, this.data.templateFieldValues || {});
    var value = String(this.data.templateFieldEditorValue || '').trim();
    if (value) values[label] = value;
    else delete values[label];
    var guideState = buildTemplateGuideState(this.data.selectedTemplate, this.data.templateGuideExpanded, values);
    this.setData(Object.assign({
      templateFieldValues: values,
      templateFieldFilledCount: templateFieldMaterial.countFilledFields(guideState.templateGuideFields),
      templateFieldEditorVisible: false,
      templateFieldEditorLabel: '',
      templateFieldEditorValue: '',
      templateFieldsPanelVisible: true,
      templateFieldChoicesVisible: true
    }, guideState), function () {
      if (wx.hideKeyboard) wx.hideKeyboard();
      this.persistWorkspaceDraft();
      this.refreshSendState();
      this.syncComposerLayout();
      wx.showToast({ title: value ? '字段已保存' : '字段已清空', icon: 'none' });
    }.bind(this));
  },

  selectDetailLevel: function (e) {
    var value = normalizeDetailLevel(e.currentTarget.dataset.value);
    var labels = { concise: '简洁', standard: '标准', detailed: '详细' };
    this.setData({ detailLevel: value, detailLevelLabel: labels[value] }, function () {
      this.persistWorkspaceDraft();
      this.syncComposerLayout();
    }.bind(this));
  },

  closeTemplateConfirm: function () {
    this._pendingTemplateSend = null;
    this.setData({ templateConfirmVisible: false, templateConfirmPreview: '', templateConfirmSources: '', templateConfirmImages: [] });
  },

  confirmTemplateSubmission: function () {
    var pending = this._pendingTemplateSend;
    if (!pending) return;
    this._pendingTemplateSend = null;
    this.setData({ templateConfirmVisible: false, templateConfirmPreview: '', templateConfirmSources: '', templateConfirmImages: [] });
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
    this.setData({
      inputText: text,
      composerMoreVisible: false,
      templateFieldsPanelVisible: false,
      templateFieldChoicesVisible: false
    }, function () {
      this.persistWorkspaceDraft();
      this.refreshMaterialSummary();
      this.refreshSendState();
      this.syncComposerLayout();
    }.bind(this));
  },

  persistWorkspaceDraft: function () {
    var inputText = String(this.data.inputText || '');
    var templateId = this.data.selectedTemplateId || '';
    var voiceMaterials = this.data.pendingVoiceMaterials || [];
    if (!inputText && !templateId && !voiceMaterials.length) {
      wx.removeStorageSync(AI_WORKSPACE_DRAFT_KEY);
      return;
    }
    wx.setStorageSync(AI_WORKSPACE_DRAFT_KEY, {
      inputText: inputText,
      voiceMaterials: voiceMaterials,
      templateId: templateId,
      templateFieldValues: this.data.templateFieldValues || {},
      detailLevel: this.data.detailLevel,
      updatedAt: Date.now()
    });
  },

  refreshSendState: function () {
    this.refreshMaterialSummary();
    var freeText = combineInputMaterials(
      stripEmptyTemplateFields(this.data.inputText, this.data.templateGuideFields),
      this.data.pendingVoiceMaterials
    );
    var materialText = templateFieldMaterial.combineMaterials(freeText, this.data.templateGuideFields);
    var hasText = materialText.length > 0;
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

    var rawInputText = String(
      options.materialsCombined && options.restoreMessage !== undefined
        ? options.restoreMessage
        : (options.message !== undefined ? options.message : this.data.inputText || '')
    ).trim();
    var attachments = options.attachments || (this.data.pendingAttachments || []).slice();
    var isDocumentRevision = Boolean(options.applyToDocumentId);
    var voiceMaterials = isDocumentRevision ? [] : (options.voiceMaterials || (this.data.pendingVoiceMaterials || []).slice());
    var message = options.materialsCombined
      ? String(options.message || '').trim()
      : combineInputMaterials(rawInputText, voiceMaterials);
    var templateId = options.templateId !== undefined ? options.templateId : (this.data.selectedTemplateId || '');
    var freeMessage = message;
    if (templateId && !isDocumentRevision) {
      var cleanTypedText = stripEmptyTemplateFields(rawInputText, this.data.templateGuideFields);
      freeMessage = combineInputMaterials(cleanTypedText, voiceMaterials);
      if (!options.materialsCombined) {
        message = templateFieldMaterial.combineMaterials(freeMessage, this.data.templateGuideFields);
      }
    }
    if (!message && !attachments.length) {
      wx.showToast({ title: '请提供一段记录或至少填写一项', icon: 'none' });
      this.refreshSendState();
      return;
    }
    if (templateId && !isDocumentRevision && !options.skipTemplateConfirm) {
      this._pendingTemplateSend = { message: message, restoreMessage: rawInputText, voiceMaterials: voiceMaterials, attachments: attachments, templateId: templateId, detailLevel: this.data.detailLevel, materialsCombined: true };
      this.setData({
        templateConfirmVisible: true,
        templateConfirmPreview: buildTemplateConfirmPreview(rawInputText, attachments, voiceMaterials, this.data.templateGuideFields),
        templateConfirmSources: buildMaterialSummary(rawInputText, attachments, voiceMaterials, this.data.templateGuideFields).materialSummaryText,
        templateConfirmImages: attachmentsToPreviewItems(attachments)
      }, this.scrollChatToBottom.bind(this));
      return;
    }
    // Template generation keeps source material separate from instructions. The server
    // owns the template contract and professional processing rules.
    var materialText = templateId && !isDocumentRevision ? message : '';
    var apiMessage = templateId && !isDocumentRevision ? '' : message;
    var visibleMessage = isDocumentRevision ? '正在按补充信息修订文书' : message;
    // Bind server memory to one generated document, not to the whole page. Every new
    // template draft gets a fresh context; a revision reuses only its target draft's
    // context. This prevents consecutive drafts from sharing facts.
    var documentContextId = isDocumentRevision
      ? (options.contextId || createDocumentContextId())
      : (templateId ? createDocumentContextId() : (this.data.documentContextId || createDocumentContextId()));
    var taskMessages = templateId ? [] : this.data.messages;
    var conversationHistory = buildConversationHistory(taskMessages);

    var userMessage = createMessage('user', visibleMessage, {
      chatContent: buildUserChatContent(visibleMessage, attachments),
      rawAttachments: attachments,
      isRevisionRequest: isDocumentRevision,
      revisionTargetId: options.applyToDocumentId || '',
      documentContextId: documentContextId
    });

    var streamMessage = createMessage('assistant', '', {
      status: 'pending',
      streamingText: '',
      bodyText: '',
      resultType: 'text',
      request: {
        message: apiMessage,
        materialText: materialText,
        restoreMessage: isDocumentRevision ? '' : (options.restoreMessage !== undefined ? options.restoreMessage : freeMessage),
        voiceMaterials: isDocumentRevision ? [] : voiceMaterials,
        templateFieldValues: templateId && !isDocumentRevision ? Object.assign({}, this.data.templateFieldValues || {}) : {},
        attachments: attachments,
        templateId: templateId,
        detailLevel: options.detailLevel || this.data.detailLevel,
        applyToDocumentId: options.applyToDocumentId || '',
        forceDocument: Boolean(options.forceDocument),
        documentContextId: documentContextId
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
      pendingVoiceMaterials: isDocumentRevision ? this.data.pendingVoiceMaterials : [],
      materialSummaryText: isDocumentRevision ? this.data.materialSummaryText : '还没有添加材料',
      materialReady: isDocumentRevision ? this.data.materialReady : false,
      materialRecognizing: false,
      materialFeedbackText: '',
      documentContextId: documentContextId,
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
      materialText: materialText,
      attachments: attachmentsToUploadPayload(attachments),
      messages: conversationHistory,
      templateId: templateId,
      detailLevel: options.detailLevel || this.data.detailLevel,
      contextId: documentContextId
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
    var completedState = {
      sending: false,
      sendingStageLabel: '',
      streamingMessageId: '',
      documentTaskStartIndex: request.templateId ? this.data.messages.length : this.data.documentTaskStartIndex,
      messages: updateMessageById(this.data.messages, messageId, {
        status: 'complete',
        resultText: finalResult.resultText || bodyText,
        bodyText: bodyText,
        streamingText: '',
        resultType: 'text',
        isDocument: Boolean(request.forceDocument) || shouldRenderDocument({ bodyText: bodyText }, request.templateId || this.data.selectedTemplateId),
        confirmItems: Array.isArray(finalResult.confirmItems) ? finalResult.confirmItems.map(function (text) { return { text: text, checked: false }; }) : []
      })
    };
    if (request.templateId) {
      completedState = Object.assign(completedState, {
        templateFieldValues: {},
        templateFieldFilledCount: 0,
        templateFieldsPanelVisible: false,
        templateFieldChoicesVisible: false
      }, buildTemplateGuideState(this.data.selectedTemplate, false, {}));
    }
    this.setData(completedState, function () {
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
        that.setPendingAttachments(next, function () {
          that.refreshSendState();
          that.setData({
            materialFeedbackText: that.data.selectedTemplateName
              ? 'OCR 已加入“' + that.data.selectedTemplateName + '”，AI 会自动提取并归入对应章节'
              : 'OCR 已加入本次对话材料'
          });
        });
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
    this.closeComposerPanels();
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
    this.closeComposerPanels();
    featureEntitlements.guardAiFeature('asr', '语音转写').then(function (ok) {
      if (!ok) return;
      wx.navigateTo({ url: '/pages/asr/index?returnTo=ai' });
    });
  },

  consumeMediaInputDraft: function () {
    var draft = wx.getStorageSync(AI_MEDIA_INPUT_DRAFT_KEY);
    if (!draft || !draft.text) return;
    wx.removeStorageSync(AI_MEDIA_INPUT_DRAFT_KEY);
    var incoming = String(draft.text || '').trim();
    var items = (this.data.pendingVoiceMaterials || []).slice();
    items.push({
      id: draft.id || ('voice-' + Date.now() + '-' + Math.floor(Math.random() * 100000)),
      text: incoming,
      durationText: String(draft.durationText || ''),
      createdAt: draft.updatedAt || new Date().toISOString()
    });
    this.setData({
      pendingVoiceMaterials: items,
      materialFeedbackText: this.data.selectedTemplateName
        ? '第 ' + items.length + ' 条录音已独立加入“' + this.data.selectedTemplateName + '”'
        : '第 ' + items.length + ' 条录音已独立加入本次对话'
    }, function () {
      this.persistWorkspaceDraft();
      this.refreshMaterialSummary();
      this.refreshSendState();
      this.syncComposerLayout();
    }.bind(this));
  },

  removeVoiceMaterial: function (e) {
    var id = String(e.currentTarget.dataset.id || '');
    var items = (this.data.pendingVoiceMaterials || []).filter(function (item) { return item.id !== id; });
    this.setData({ pendingVoiceMaterials: items }, function () {
      this.persistWorkspaceDraft();
      this.refreshSendState();
      this.syncComposerLayout();
    }.bind(this));
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
    this.setData({
      confirmEditorVisible: true,
      confirmEditorMode: 'direct',
      confirmEditorMessageId: latest.id,
      confirmEditorIndex: -1,
      confirmEditorTitle: '编辑正文',
      confirmEditorHint: '直接修改文字并保存，不会再次调用 AI。',
      confirmEditorText: text
    });
  },

  openConfirmEditor: function (e) {
    var messageId = e.currentTarget.dataset.id;
    var itemIndex = Number(e.currentTarget.dataset.index);
    var message = (this.data.messages || []).find(function (item) { return item.id === messageId; });
    var confirm = message && (message.confirmItems || [])[itemIndex];
    if (!confirm) return;
    this.setData({
      confirmEditorVisible: true,
      confirmEditorMode: 'ai',
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
      confirmEditorMode: 'ai',
      confirmEditorMessageId: e.currentTarget.dataset.id,
      confirmEditorIndex: -1,
      confirmEditorTitle: '修订当前文书',
      confirmEditorHint: '输入需要修改、补充或删除的内容',
      confirmEditorText: ''
    });
  },

  closeConfirmEditor: function () {
    this.setData({ confirmEditorVisible: false, confirmEditorText: '', confirmEditorMode: 'ai' });
  },

  onConfirmEditorInput: function (e) {
    this.setData({ confirmEditorText: e.detail.value || '' });
  },

  applyDocumentChange: function () {
    if (this.data.confirmEditorMode !== 'direct') {
      this.applyDocumentRevision();
      return;
    }
    var messageId = this.data.confirmEditorMessageId;
    var text = String(this.data.confirmEditorText || '').trim();
    if (!text) {
      wx.showToast({ title: '正文不能为空', icon: 'none' });
      return;
    }
    this.setData({
      confirmEditorVisible: false,
      confirmEditorText: '',
      confirmEditorMode: 'ai',
      messages: updateMessageById(this.data.messages, messageId, {
        bodyText: text,
        resultText: text,
        content: text,
        revisedAt: Date.now()
      })
    }, function () {
      wx.showToast({ title: '修改已保存', icon: 'success' });
    });
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
      templateId: documentMessage.request && documentMessage.request.templateId || this.data.selectedTemplateId || '',
      detailLevel: documentMessage.request && documentMessage.request.detailLevel || this.data.detailLevel,
      contextId: documentMessage.request && documentMessage.request.documentContextId || documentMessage.documentContextId || createDocumentContextId()
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
    var restoredValues = request.templateFieldValues || {};
    this.setData(Object.assign({
      inputText: request.restoreMessage !== undefined ? request.restoreMessage : (request.message || ''),
      pendingAttachments: request.attachments || [],
      pendingPreviewItems: attachmentsToPreviewItems(request.attachments || []),
      pendingVoiceMaterials: request.voiceMaterials || [],
      templateFieldValues: restoredValues,
      detailLevel: normalizeDetailLevel(request.detailLevel || this.data.detailLevel),
      detailLevelLabel: ({ concise: '简洁', standard: '标准', detailed: '详细' })[normalizeDetailLevel(request.detailLevel || this.data.detailLevel)]
    }, buildTemplateGuideState(this.data.selectedTemplate, this.data.templateGuideExpanded, restoredValues)), function () {
      this.persistWorkspaceDraft();
      this.refreshSendState();
      this.syncComposerLayout();
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
    if (e.currentTarget.dataset.action === 'template') {
      this.openTemplatePicker();
      return;
    }
    this.setData({ inputText: e.currentTarget.dataset.prompt || '' }, this.refreshSendState.bind(this));
  },

  startNewDocument: function () {
    var hasCurrentWork = Boolean((this.data.messages || []).length || this.data.materialReady);
    if (!hasCurrentWork) return;
    wx.showModal({
      title: '新建一份内容？',
      content: '当前对话和未提交材料会从本页清除，已选模板会保留。',
      confirmText: '确认新建',
      success: function (res) {
        if (res.confirm) this.clearSession();
      }.bind(this)
    });
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
      pendingVoiceMaterials: [],
      composerMoreVisible: false,
      materialSummaryText: '还没有添加材料',
      materialReady: false,
      materialRecognizing: false,
      materialFeedbackText: '',
      sending: false,
      sendingStageLabel: '',
      streamingMessageId: '',
      activeStreamTask: null,
      cancelledMessageId: '',
      templateFieldsPanelVisible: false,
      templateFieldChoicesVisible: false,
      templateFieldValues: {},
      templateFieldFilledCount: 0,
      templateFieldEditorVisible: false,
      templateFieldEditorLabel: '',
      templateFieldEditorValue: '',
      documentTaskStartIndex: 0,
      documentContextId: createDocumentContextId()
    }, function () {
      this.persistWorkspaceDraft();
      this.refreshSendState();
    }.bind(this));
  },

  onHide: function () {
    if (wx.hideKeyboard) wx.hideKeyboard();
    if (this.data.templateFieldEditorVisible || this.data.templateFieldsPanelVisible || this.data.templateFieldChoicesVisible || this.data.composerMoreVisible) {
      this.setData({
        composerMoreVisible: false,
        templateFieldEditorVisible: false,
        templateFieldEditorLabel: '',
        templateFieldEditorValue: '',
        templateFieldsPanelVisible: false,
        templateFieldChoicesVisible: false
      });
    }
  },

  onUnload: function () {
    if (this._composerLayoutTimer) clearTimeout(this._composerLayoutTimer);
    if (this._keyboardHeightHandler && wx.offKeyboardHeightChange) {
      wx.offKeyboardHeightChange(this._keyboardHeightHandler);
    }
    var task = this.data.activeStreamTask;
    if (task && typeof task.abort === 'function') {
      task.abort();
    }
  }
});
