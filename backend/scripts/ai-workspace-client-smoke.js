var storage = {};
var lastActionSheet = null;
var lastModal = null;
global.wx = {
  getStorageSync: function (key) { return storage[key] || ''; },
  setStorageSync: function (key, value) { storage[key] = value; },
  removeStorageSync: function (key) { delete storage[key]; },
  showToast: function () {}, hideKeyboard: function () {},
  showActionSheet: function (options) { lastActionSheet = options; },
  showModal: function (options) { lastModal = options; },
  createSelectorQuery: function () { return { in: function () { return this; }, select: function () { return this; }, boundingClientRect: function (cb) { cb({ height: 300 }); return this; }, exec: function () {} }; }
};
global.getApp = function () { return { globalData: {} }; };
global.Page = function (definition) { global.__workspacePage = definition; };

var capturedChat = null;
var capturedMaterials = [];
var createdWorkspaces = [];
var savedFields = [];
var chatPath = require.resolve('../../services/agent/chat');
require.cache[chatPath] = { id: chatPath, filename: chatPath, loaded: true, exports: {
  sendChatStream: function (options) { capturedChat = options; return { abort: function () {} }; }
} };
var workspacePath = require.resolve('../../services/ai/workspace');
require.cache[workspacePath] = { id: workspacePath, filename: workspacePath, loaded: true, exports: {
  createWorkspace: function (templateId) { createdWorkspaces.push(templateId); return Promise.resolve({ id: 'aiw-' + templateId }); },
  getWorkspace: function () { return Promise.resolve(null); },
  updateWorkspace: function () { return Promise.resolve(null); },
  saveField: function (workspaceId, key, value) { savedFields.push({ workspaceId: workspaceId, key: key, value: value }); return Promise.resolve(null); },
  addMaterial: function (id, material) { capturedMaterials.push({ workspaceId: id, material: material }); return Promise.resolve({ material: material }); },
  createGeneration: function () { return Promise.resolve({ id: 'aig-client' }); }
} };

require('../../pages/ai/detail.js');

function createPage() {
  return Object.assign({}, global.__workspacePage, {
    data: Object.assign({}, global.__workspacePage.data),
    setData: function (patch, callback) { this.data = Object.assign({}, this.data, patch); if (callback) callback.call(this); },
    selectComponent: function () { return null; }
  });
}

async function main() {
  var page = createPage();
  page._serverWorkspaceSelected = true;
  page.data.selectedTemplateId = 'tpl-client';
  page.data.selectedTemplateName = '测试模板';
  page.data.selectedTemplate = { id: 'tpl-client', fields: [{ label: '主题' }] };
  page.data.templateGuideFields = [{ key: 'topic', label: '主题', value: '已确认主题', filled: true }];
  page.data.templateFieldValues = { topic: '已确认主题' };
  page.data.activeWorkspaceId = 'aiw-client';
  page.data.documentContextId = 'aiw-client';
  page.data.inputText = '就这样吧，你开始写吧';
  page.data.canSend = true;
  page.sendMessage({ skipTemplateConfirm: true });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  if (capturedMaterials.some(function (item) { return /就这样|开始写/.test(item.material.text); })) {
    throw new Error('generate command was persisted as document material');
  }
  if (!capturedChat || capturedChat.workspaceId !== 'aiw-client' || capturedChat.generationId !== 'aig-client' || capturedChat.messages.length) {
    throw new Error('workspace generation did not use the isolated server snapshot');
  }

  capturedChat = null;
  capturedMaterials = [];
  var chatPage = createPage();
  chatPage.data.selectedTemplateId = 'tpl-client';
  chatPage.data.selectedTemplateName = '测试模板';
  chatPage.data.activeWorkspaceId = 'aiw-client';
  chatPage.data.documentContextId = 'aiw-client';
  chatPage.data.composerMode = 'chat';
  chatPage.data.sideChatContextId = 'side-chat';
  chatPage.data.templateGuideFields = [{ key: 'topic', label: '主题', value: '模板字段', filled: true }];
  chatPage.data.inputText = '';
  chatPage.refreshSendState();
  if (chatPage.data.canSend) throw new Error('template fields incorrectly enabled an empty one-shot chat send');
  chatPage.data.inputText = '今天天气怎么样？';
  chatPage.refreshSendState();
  if (!chatPage.data.canSend) throw new Error('typed one-shot chat question did not enable send');
  chatPage.sendMessage({});
  if (!capturedChat || capturedChat.workspaceId || capturedChat.generationId || capturedChat.contextId !== 'side-chat' || capturedMaterials.length) {
    throw new Error('ordinary chat contaminated the active workspace');
  }
  if (chatPage.data.composerMode !== 'workspace' || chatPage.data.sideChatContextId === 'side-chat' || chatPage.data.documentContextId !== 'aiw-client') {
    throw new Error('one-shot ordinary chat did not automatically return to the document workspace');
  }
  var oneShotResponse = chatPage.data.messages.find(function (item) { return item.role === 'assistant' && item.status === 'pending'; });
  chatPage.finishStreamResponse(oneShotResponse.id, { bodyText: '今天适合带伞。', confirmItems: [] }, {});
  var renderedOneShot = chatPage.data.messages.find(function (item) { return item.id === oneShotResponse.id; });
  if (renderedOneShot.isDocument) throw new Error('one-shot ordinary answer was incorrectly rendered as a document');

  capturedChat = null;
  lastActionSheet = null;
  var questionPage = createPage();
  questionPage.data.selectedTemplateId = 'tpl-client';
  questionPage.data.selectedTemplateName = '测试模板';
  questionPage.data.activeWorkspaceId = 'aiw-client';
  questionPage.data.documentContextId = 'aiw-client';
  questionPage.data.sideChatContextId = 'side-question';
  questionPage.data.inputText = '今天天气怎么样？';
  questionPage.data.canSend = true;
  questionPage.sendMessage({});
  if (!lastActionSheet || capturedChat) throw new Error('question-like input was not stopped before contaminating a template');
  lastActionSheet.success({ tapIndex: 0 });
  if (!capturedChat || capturedChat.workspaceId || capturedChat.templateId || capturedChat.contextId !== 'side-question') {
    throw new Error('confirmed ordinary question was not isolated from the active template');
  }

  var blockedOneShotPage = createPage();
  blockedOneShotPage.data.selectedTemplateId = 'tpl-client';
  blockedOneShotPage.data.pendingVoiceMaterials = [{ id: 'voice-pending', text: '尚未生成的模板录音' }];
  blockedOneShotPage.startOneShotChat();
  if (blockedOneShotPage.data.composerMode === 'chat') throw new Error('one-shot chat stole pending document media');

  capturedChat = null;
  capturedMaterials = [];
  savedFields = [];
  var confirmPage = createPage();
  confirmPage._serverWorkspaceSelected = true;
  confirmPage.data.selectedTemplateId = 'tpl-confirm';
  confirmPage.data.selectedTemplateName = '确认模板';
  confirmPage.data.selectedTemplate = { id: 'tpl-confirm', fields: { first: { label: '字段一' }, second: { label: '字段二' } } };
  confirmPage.data.templateGuideFields = [
    { key: 'first', label: '字段一', value: '', filled: false },
    { key: 'second', label: '字段二', value: '', filled: false }
  ];
  confirmPage.data.activeWorkspaceId = 'aiw-confirm';
  confirmPage.data.documentContextId = 'aiw-confirm';
  confirmPage.data.templateFieldsPanelVisible = true;
  confirmPage.data.templateFieldEditorLabel = '字段一';
  confirmPage.data.templateFieldEditorKey = 'first';
  confirmPage.data.templateFieldEditorValue = '值一';
  confirmPage.saveTemplateFieldValue();
  if (confirmPage.data.templateNextStepText.indexOf('字段二') < 0 || confirmPage.data.templateNextStepText.indexOf('字段一') >= 0) {
    throw new Error('next-step hint still suggested a field that was already filled');
  }
  confirmPage.data.templateFieldEditorLabel = '字段二';
  confirmPage.data.templateFieldEditorKey = 'second';
  confirmPage.data.templateFieldEditorValue = '值二';
  confirmPage.saveTemplateFieldValue();
  if (!confirmPage.data.templateFieldsPanelVisible || !confirmPage.data.templateFieldChoicesVisible || confirmPage.data.templateFieldValues.first !== '值一' || confirmPage.data.templateFieldValues.second !== '值二') {
    throw new Error('filling one template field made the next field hard to continue');
  }

  lastModal = null;
  confirmPage.data.materialReady = true;
  confirmPage.data.inputText = '原始文字';
  confirmPage.requestCloseTemplate();
  if (!lastModal) throw new Error('closing a template with material skipped confirmation');
  lastModal.success({ confirm: true });
  if (confirmPage.data.selectedTemplateId || confirmPage.data.inputText.indexOf('字段一：值一') < 0 || confirmPage.data.inputText.indexOf('字段二：值二') < 0) {
    throw new Error('closing a template lost filled fields or left the template active');
  }

  confirmPage.data.selectedTemplateId = 'tpl-confirm';
  confirmPage.data.selectedTemplateName = '确认模板';
  confirmPage.data.selectedTemplate = { id: 'tpl-confirm', fields: { first: { label: '字段一' }, second: { label: '字段二' } } };
  confirmPage.data.templateGuideFields = [
    { key: 'first', label: '字段一', value: '值一', filled: true },
    { key: 'second', label: '字段二', value: '值二', filled: true }
  ];
  confirmPage.data.templateFieldValues = { first: '值一', second: '值二' };
  confirmPage.data.templateFieldFilledCount = 2;
  confirmPage.data.activeWorkspaceId = 'aiw-confirm';
  confirmPage.data.documentContextId = 'aiw-confirm';
  confirmPage.data.materialReady = false;
  confirmPage._serverWorkspaceSelected = true;

  var nestedPage = createPage();
  nestedPage.data.templates = [{
    id: 'tpl-nested',
    name: '嵌套模板',
    fields: { section: { nested: { label: '嵌套字段' }, _label: '分组标题' } }
  }];
  nestedPage.selectTemplateByIndex(0);
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  if (!nestedPage.data.templateGuideFields.length || nestedPage.data.templateGuideFields[0].key !== 'section.nested') {
    throw new Error('client nested field key no longer matches the server field path');
  }

  confirmPage.data.inputText = '一段原始记录';
  confirmPage.refreshSendState();
  confirmPage.sendMessage({});
  if (!confirmPage.data.templateConfirmVisible || capturedMaterials.length || capturedChat) {
    throw new Error('first document send skipped the user confirmation step');
  }
  confirmPage.closeTemplateConfirm();
  if (confirmPage.data.inputText !== '一段原始记录') throw new Error('returning from confirmation lost the user input');
  confirmPage.sendMessage({});
  confirmPage.confirmTemplateSubmission();
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  if (!capturedChat || capturedChat.workspaceId !== 'aiw-confirm' || !capturedChat.generationId || !capturedMaterials.some(function (item) { return item.workspaceId === 'aiw-confirm' && item.material.kind === 'typed'; })) {
    throw new Error('confirmed document materials did not reach the isolated generation');
  }

  capturedMaterials = [];
  savedFields = [];
  createdWorkspaces = [];
  var switchPage = createPage();
  switchPage.data.templates = [
    { id: 'tpl-a', name: '模板A', fields: { topic: { label: '主题' } } },
    { id: 'tpl-b', name: '模板B', fields: { summary: { label: '摘要' } } }
  ];
  switchPage.selectTemplateByIndex(0);
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  if (switchPage.data.activeWorkspaceId !== 'aiw-tpl-a' || createdWorkspaces.join(',') !== 'tpl-a') {
    throw new Error('first template selection did not create exactly one matching workspace');
  }
  switchPage.data.inputText = '模板A的文字材料';
  switchPage.data.templateGuideFields = [{ key: 'topic', label: '主题', value: '字段材料', filled: true }];
  switchPage.data.templateFieldValues = { topic: '字段材料' };
  switchPage.data.pendingVoiceMaterials = [{ id: 'voice-a', text: '模板A的录音材料' }];
  switchPage.data.pendingAttachments = [{ id: 'ocr-a', ocrText: '模板A的OCR材料' }];
  switchPage.data.pendingPreviewItems = [{ id: 'ocr-a', url: 'tmp://a' }];
  switchPage.data.materialReady = true;
  switchPage.selectTemplateByIndex(1);
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  if (!savedFields.some(function (item) { return item.workspaceId === 'aiw-tpl-a' && item.key === 'topic' && item.value === '字段材料'; })) {
    throw new Error('filled fields were lost while switching templates');
  }
  ['typed', 'asr', 'ocr'].forEach(function (kind) {
    if (!capturedMaterials.some(function (item) { return item.workspaceId === 'aiw-tpl-a' && item.material.kind === kind; })) {
      throw new Error(kind + ' material was not preserved in the old workspace');
    }
  });
  if (switchPage.data.selectedTemplateId !== 'tpl-b' || switchPage.data.activeWorkspaceId !== 'aiw-tpl-b' || switchPage.data.inputText || switchPage.data.pendingVoiceMaterials.length || switchPage.data.pendingAttachments.length) {
    throw new Error('new template did not start with a clean isolated composer');
  }

  capturedMaterials = [];
  storage.aiMediaInputDraft = { id: 'voice-old', workspaceId: 'aiw-old', text: '旧任务录音', durationText: '12秒' };
  switchPage.consumeMediaInputDraft();
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  if (!capturedMaterials.some(function (item) { return item.workspaceId === 'aiw-old' && item.material.text === '旧任务录音'; }) || switchPage.data.pendingVoiceMaterials.length) {
    throw new Error('late recording return contaminated the currently selected template');
  }
  console.log('AI_WORKSPACE_CLIENT_SMOKE_OK');
}

main().catch(function (error) { console.error(error.stack || error.message); process.exit(1); });
