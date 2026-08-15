var storage = {};
global.wx = {
  getStorageSync: function (key) { return storage[key] || ''; },
  setStorageSync: function (key, value) { storage[key] = value; },
  removeStorageSync: function (key) { delete storage[key]; },
  showToast: function () {}, hideKeyboard: function () {},
  createSelectorQuery: function () { return { in: function () { return this; }, select: function () { return this; }, boundingClientRect: function (cb) { cb({ height: 300 }); return this; }, exec: function () {} }; }
};
global.getApp = function () { return { globalData: {} }; };
global.Page = function (definition) { global.__workspacePage = definition; };

var capturedChat = null;
var capturedMaterials = [];
var chatPath = require.resolve('../../services/agent/chat');
require.cache[chatPath] = { id: chatPath, filename: chatPath, loaded: true, exports: {
  sendChatStream: function (options) { capturedChat = options; return { abort: function () {} }; }
} };
var workspacePath = require.resolve('../../services/ai/workspace');
require.cache[workspacePath] = { id: workspacePath, filename: workspacePath, loaded: true, exports: {
  createWorkspace: function () { return Promise.resolve({ id: 'aiw-client' }); },
  getWorkspace: function () { return Promise.resolve(null); },
  updateWorkspace: function () { return Promise.resolve(null); },
  saveField: function () { return Promise.resolve(null); },
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
  chatPage.data.composerMode = 'chat';
  chatPage.data.sideChatContextId = 'side-chat';
  chatPage.data.inputText = '今天天气怎么样？';
  chatPage.data.canSend = true;
  chatPage.sendMessage({});
  if (!capturedChat || capturedChat.workspaceId || capturedChat.generationId || capturedChat.contextId !== 'side-chat' || capturedMaterials.length) {
    throw new Error('ordinary chat contaminated the active workspace');
  }
  console.log('AI_WORKSPACE_CLIENT_SMOKE_OK');
}

main().catch(function (error) { console.error(error.stack || error.message); process.exit(1); });
