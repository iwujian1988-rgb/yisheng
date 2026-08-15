var storage = { asrRecoverableDraft: { resultText: '上一轮内容', audioPath: 'old.mp3' } };
var startOptions = null;
var recorder = {
  onStop: function (callback) { this.stopCallback = callback; },
  onError: function (callback) { this.errorCallback = callback; },
  start: function (options) { startOptions = options; },
  stop: function () {}
};

global.wx = {
  getStorageSync: function (key) { return storage[key] || ''; },
  setStorageSync: function (key, value) { storage[key] = value; },
  removeStorageSync: function (key) { delete storage[key]; },
  getRecorderManager: function () { return recorder; },
  showToast: function () {}
};
global.getApp = function () { return { globalData: {} }; };
global.Page = function (definition) { global.__asrPage = definition; };

var transcriberPath = require.resolve('../../services/asr/transcriber');
require.cache[transcriberPath] = {
  id: transcriberPath,
  filename: transcriberPath,
  loaded: true,
  exports: { transcribeAudio: function () { return Promise.resolve({ text: '本轮内容' }); } }
};
var entitlementPath = require.resolve('../../services/entitlements/features');
require.cache[entitlementPath] = {
  id: entitlementPath,
  filename: entitlementPath,
  loaded: true,
  exports: { guardAiFeature: function () { return Promise.resolve(true); } }
};

require('../../pages/asr/index.js');

var page = Object.assign({}, global.__asrPage, {
  data: Object.assign({}, global.__asrPage.data, {
    editableText: '上一轮内容',
    resultText: '上一轮内容',
    audioPath: 'old.mp3',
    hasRecoverableAudio: true,
    segmentCount: 3
  }),
  setData: function (patch, callback) {
    this.data = Object.assign({}, this.data, patch);
    if (callback) callback.call(this);
  },
  startRecordTimer: function () {},
  startAutosaveTimer: function () {}
});

page.setupRecorder();
page.startRecord();

if (!startOptions || startOptions.duration < 60 * 1000) {
  throw new Error('recorder still uses a short forced segment');
}
if (page.data.editableText || page.data.resultText || page.data.segmentCount !== 0 || storage.asrRecoverableDraft) {
  throw new Error('a new recording did not start with an isolated transcript');
}

page.clearTimers();
console.log('ASR_RECORDING_FLOW_SMOKE_OK');
