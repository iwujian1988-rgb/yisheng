global.wx = {
  getStorageSync: function () { return ''; },
  setStorageSync: function () {},
  removeStorageSync: function () {},
  showToast: function () {},
  hideKeyboard: function () {},
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

require('../../pages/ai/detail.js');

var page = Object.assign({}, global.__aiDetailPage, {
  data: Object.assign({}, global.__aiDetailPage.data),
  setData: function (patch, callback) {
    this.data = Object.assign({}, this.data, patch);
    if (callback) callback.call(this);
  },
  selectComponent: function () { return null; }
});

page.data.selectedTemplateId = 'tpl-smoke';
page.data.selectedTemplateName = '测试模板';
page.data.selectedTemplate = {
  fields: [{ label: '出院诊断' }, { label: '入院诊断' }]
};

[
  ['出院诊断', '社区获得性肺炎'],
  ['入院诊断', '肺部感染']
].forEach(function (pair) {
  page.data.templateFieldEditorLabel = pair[0];
  page.data.templateFieldEditorValue = pair[1];
  page.saveTemplateFieldValue();
});

if (!page.data.canSend || page.data.templateFieldFilledCount !== 2) {
  throw new Error('two filled fields did not enable generation');
}

page.sendMessage({});
var pending = page._pendingTemplateSend || {};
if (!page.data.templateConfirmVisible
  || String(pending.message || '').indexOf('出院诊断：社区获得性肺炎') < 0
  || String(pending.message || '').indexOf('入院诊断：肺部感染') < 0
  || page.data.templateConfirmPreview.indexOf('【已填模板字段】') < 0) {
  throw new Error('filled fields did not reach generation confirmation');
}

page.confirmTemplateSubmission();
var streamMessage = page.data.messages[page.data.messages.length - 1] || {};
if (!capturedChatOptions
  || String(capturedChatOptions.materialText || '').indexOf('出院诊断：社区获得性肺炎') < 0
  || String(capturedChatOptions.materialText || '').indexOf('入院诊断：肺部感染') < 0
  || !streamMessage.request
  || streamMessage.request.restoreMessage !== ''
  || streamMessage.request.templateFieldValues['出院诊断'] !== '社区获得性肺炎') {
  throw new Error('confirmed field values did not reach the agent request');
}

console.log('AI_FIELD_FLOW_SMOKE_OK');
