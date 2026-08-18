var storage = {};
var keyboardHeightHandler = null;
var removedKeyboardHeightHandler = null;
var tabBarState = { hidden: false };
global.wx = {
  getStorageSync: function (key) { return storage[key] || ''; },
  setStorageSync: function (key, value) { storage[key] = value; },
  removeStorageSync: function (key) { delete storage[key]; },
  showToast: function () {},
  hideKeyboard: function () {},
  onKeyboardHeightChange: function (handler) { keyboardHeightHandler = handler; },
  offKeyboardHeightChange: function (handler) { removedKeyboardHeightHandler = handler; },
  navigateBack: function () {},
  reLaunch: function () {},
  createSelectorQuery: function () {
    return {
      in: function () { return this; },
      select: function () { return this; },
      boundingClientRect: function (callback) { callback({ height: 300 }); return this; },
      exec: function () {}
    };
  }
};
global.getApp = function () { return { globalData: {} }; };
global.Page = function (definition) { global.__aiDetailPage = definition; };

var capturedChatOptions = null;
var capturedMaterials = [];
var generationCalls = 0;
var chatModulePath = require.resolve('../../services/agent/chat');
require.cache[chatModulePath] = {
  id: chatModulePath,
  filename: chatModulePath,
  loaded: true,
  exports: {
    sendChatStream: function (options) {
      capturedChatOptions = options;
      return { abort: function () {} };
    }
  }
};
var workspaceModulePath = require.resolve('../../services/ai/workspace');
require.cache[workspaceModulePath] = {
  id: workspaceModulePath,
  filename: workspaceModulePath,
  loaded: true,
  exports: {
    createWorkspace: function () { return Promise.resolve({ id: 'aiw-field-flow' }); },
    getWorkspace: function () { return Promise.resolve(null); },
    updateWorkspace: function () { return Promise.resolve(null); },
    saveField: function () { return Promise.resolve(null); },
    addMaterial: function (id, material) { capturedMaterials.push(material); return Promise.resolve({ material: material }); },
    createGeneration: function () { generationCalls += 1; return Promise.resolve({ id: 'aig-field-flow' }); }
  }
};
var entitlementsModulePath = require.resolve('../../services/entitlements/features');
require.cache[entitlementsModulePath] = {
  id: entitlementsModulePath,
  filename: entitlementsModulePath,
  loaded: true,
  exports: {
    guardAiFeature: function () { return Promise.resolve(false); },
    isBluetoothConnected: function () { return true; }
  }
};

require('../../pages/ai/detail.js');

var page = Object.assign({}, global.__aiDetailPage, {
  data: Object.assign({}, global.__aiDetailPage.data),
  setData: function (patch, callback) {
    this.data = Object.assign({}, this.data, patch);
    if (callback) callback.call(this);
  },
  selectComponent: function () { return null; },
  getTabBar: function () {
    return {
      setData: function (patch) { tabBarState = Object.assign({}, tabBarState, patch); }
    };
  }
});

page.onLoad({});
if (typeof keyboardHeightHandler !== 'function') {
  throw new Error('keyboard height listener was not registered');
}
page.data.composerMoreVisible = true;
page.data.templateFieldsPanelVisible = true;
keyboardHeightHandler({ height: 336 });
if (!page.data.keyboardVisible
  || page.data.composerBottomStyle !== 'bottom:336px;'
  || page.data.composerMoreVisible
  || page.data.templateFieldsPanelVisible
  || !tabBarState.hidden) {
  throw new Error('keyboard opening did not move the composer and close competing panels');
}
keyboardHeightHandler({ height: 0 });
if (page.data.keyboardVisible || page.data.composerBottomStyle || tabBarState.hidden) {
  throw new Error('keyboard closing did not restore the composer and tab bar');
}
page.onUnload();
if (removedKeyboardHeightHandler !== keyboardHeightHandler || tabBarState.hidden) {
  throw new Error('keyboard listener or tab bar state was not restored on unload');
}

page.data.selectedTemplateId = 'tpl-smoke';
page.data.selectedTemplateName = '测试模板';
page.data.selectedTemplate = {
  fields: [{ label: '出院诊断' }, { label: '入院诊断' }]
};
page.data.activeWorkspaceId = 'aiw-field-flow';
page._serverWorkspaceSelected = true;

page.toggleComposerMorePanel();
if (!page.data.composerMoreVisible || page.data.templateFieldsPanelVisible) {
  throw new Error('wechat-style add panel did not open');
}
page.openTemplateToolsPanel();
if (page.data.composerMoreVisible || !page.data.templateFieldsPanelVisible) {
  throw new Error('template tools did not open as the second panel level');
}

[
  ['出院诊断', '社区获得性肺炎'],
  ['入院诊断', '肺部感染']
].forEach(function (pair, index) {
  page.data.templateFieldsPanelVisible = true;
  page.data.templateFieldChoicesVisible = true;
  page.data.templateFieldEditorLabel = pair[0];
  page.data.templateFieldEditorValue = pair[1];
  page.saveTemplateFieldValue();
  if (index === 0 && (!page.data.templateFieldEditorVisible || !page.data.templateFieldEditorLabel || page.data.templateFieldEditorLabel === pair[0])) {
    throw new Error('field editor did not advance directly to the next missing field');
  }
  if (index === 1 && (!page.data.templateFieldsPanelVisible || !page.data.templateFieldChoicesVisible || page.data.templateFieldEditorVisible)) {
    throw new Error('field list did not return after the last field');
  }
});

page.finishTemplateFields().then(function () {
  if (page.data.templateFieldsPanelVisible || page.data.templateFieldChoicesVisible) {
    throw new Error('template tools did not close after the user finished filling fields');
  }
  if (!page.data.canSend || page.data.templateFieldFilledCount !== 2 || !page.data.workspaceHasMaterials) {
    throw new Error('two filled fields were not saved or did not enable generation');
  }
  storage.aiMediaInputDraft = { id: 'voice-1', text: '第一段独立录音', durationText: '00:12' };
  page.consumeMediaInputDraft();
  storage.aiMediaInputDraft = { id: 'voice-2', text: '第二段独立录音', durationText: '00:09' };
  page.consumeMediaInputDraft();
  if (page.data.inputText !== ''
    || page.data.pendingVoiceMaterials.length !== 2
    || page.data.pendingVoiceMaterials[0].text !== '第一段独立录音'
    || page.data.pendingVoiceMaterials[1].text !== '第二段独立录音') {
    throw new Error('separate recordings were mixed into the main input');
  }
  return page.sendMessage({});
}).then(function () {
  if (!page.data.workspaceHasMaterials || page.data.pendingVoiceMaterials.length
    || capturedMaterials.filter(function (item) { return item.kind === 'asr'; }).length !== 2) {
    throw new Error('fields and separate recordings were not added to the workspace');
  }
  page.refreshSendState();
  page.sendMessage({});
  page.sendMessage({});
  return new Promise(function (resolve) { setTimeout(resolve, 0); });
}).then(function () {
  var streamMessage = page.data.messages[page.data.messages.length - 1] || {};
  if (!capturedChatOptions || capturedChatOptions.workspaceId !== 'aiw-field-flow'
    || capturedChatOptions.generationId !== 'aig-field-flow'
    || generationCalls !== 1
    || !streamMessage.request
    || streamMessage.request.templateFieldValues['出院诊断'] !== '社区获得性肺炎') {
    throw new Error('saved workspace materials did not reach isolated generation');
  }
  console.log('AI_FIELD_FLOW_SMOKE_OK');
}).catch(function (error) {
  console.error(error.stack || error.message);
  process.exit(1);
});
