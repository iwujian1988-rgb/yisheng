const asrTranscriber = require('../../services/asr/transcriber');
const featureEntitlements = require('../../services/entitlements/features');
const draftService = require('../../services/transfer/draft');
const aiAssistant = require('../../services/ai/assistant');
const quickActionsService = require('../../services/ai/quick-actions');

let recorderManager = null;
let recordTimer = null;

const MAX_RECORD_MS = 60 * 60 * 1000;
const ASR_DRAFT_KEY = 'asrRecoverableDraft';

function isDeviceConnected() {
  const app = typeof getApp === 'function' ? getApp() : null;
  const globalData = app && app.globalData ? app.globalData : {};
  return Boolean(globalData.skipBluetoothForDev || globalData.deviceConnected);
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return [
      String(hours).padStart(2, '0'),
      String(minutes).padStart(2, '0'),
      String(seconds).padStart(2, '0')
    ].join(':');
  }
  return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
}

function readRecoverableDraft() {
  const draft = wx.getStorageSync(ASR_DRAFT_KEY);
  return draft && typeof draft === 'object' ? draft : null;
}

function saveRecoverableDraft(payload) {
  const previous = readRecoverableDraft() || {};
  wx.setStorageSync(ASR_DRAFT_KEY, Object.assign({}, previous, payload || {}, {
    updatedAt: new Date().toISOString()
  }));
}

Page({
  data: {
    recording: false,
    recordStartedAt: 0,
    recordDurationText: '00:00',
    audioPath: '',
    resultText: '',
    editableText: '',
    resultMeta: null,
    transcribing: false,
    errorMessage: '',
    statusText: '录一段语音，结束后会自动转成可编辑文字。',
    hasRecoverableAudio: false
  },

  onLoad() {
    if (!featureEntitlements.guardAiFeature('asr', '语音转写')) {
      wx.navigateBack({
        delta: 1,
        fail: () => wx.reLaunch({ url: '/pages/home/home' })
      });
      return;
    }
    if (!isDeviceConnected()) {
      wx.showModal({
        title: '需要连接设备',
        content: '语音转写需要先连接设备，连接后可使用全部功能。',
        confirmText: '去连接',
        cancelText: '返回',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/bluetooth/index' });
          } else {
            wx.navigateBack({
              delta: 1,
              fail: () => wx.reLaunch({ url: '/pages/home/home' })
            });
          }
        }
      });
      return;
    }

    this.restoreRecoverableDraft();
    this.setupRecorder();
  },

  onUnload() {
    this.clearRecordTimer();
    if (this.data.recording && recorderManager) {
      recorderManager.stop();
    }
  },

  setupRecorder() {
    recorderManager = wx.getRecorderManager();
    recorderManager.onStop((res) => {
      this.clearRecordTimer();
      const audioPath = res && res.tempFilePath ? res.tempFilePath : '';
      const durationMs = Math.min(Date.now() - this.data.recordStartedAt, MAX_RECORD_MS);
      this.setData({
        recording: false,
        audioPath,
        recordDurationText: formatDuration(durationMs)
      });
      if (!audioPath) {
        this.setData({
          errorMessage: '没有拿到录音文件，请重新录制。',
          statusText: '录音没有保存成功。'
        });
        return;
      }
      saveRecoverableDraft({
        audioPath,
        durationMs,
        resultText: '',
        resultMeta: null,
        status: 'recorded'
      });
      this.setData({ hasRecoverableAudio: true });
      this.transcribeAudio(audioPath);
    });
    recorderManager.onError((error) => {
      this.clearRecordTimer();
      this.setData({
        recording: false,
        transcribing: false,
        statusText: '录音中断了，可以重新录制。',
        errorMessage: error && error.errMsg ? error.errMsg : '录音失败，请检查麦克风权限。'
      });
    });
  },

  restoreRecoverableDraft() {
    const draft = readRecoverableDraft();
    if (!draft || !draft.audioPath) return;
    this.setData({
      audioPath: draft.audioPath,
      resultText: draft.resultText || '',
      editableText: draft.resultText || '',
      resultMeta: draft.resultMeta || null,
      recordDurationText: formatDuration(draft.durationMs || 0),
      hasRecoverableAudio: true,
      statusText: draft.resultText ? '已恢复上次转写结果，可继续编辑。' : '检测到上次录音，可继续转写。'
    });
  },

  toggleRecord() {
    if (this.data.transcribing) {
      wx.showToast({ title: '正在转写，请稍等', icon: 'none' });
      return;
    }
    if (this.data.recording) {
      this.stopRecord();
      return;
    }
    this.requestRecordPermission().then(() => this.startRecord());
  },

  requestRecordPermission() {
    return new Promise((resolve) => {
      wx.getSetting({
        success: (setting) => {
          const auth = setting.authSetting || {};
          if (auth['scope.record']) {
            resolve();
            return;
          }
          wx.authorize({
            scope: 'scope.record',
            success: resolve,
            fail: () => {
              wx.showModal({
                title: '需要麦克风权限',
                content: '开启麦克风权限后才能录音。',
                confirmText: '去设置',
                success(res) {
                  if (res.confirm) wx.openSetting();
                }
              });
            }
          });
        },
        fail: resolve
      });
    });
  },

  startRecord() {
    if (!recorderManager) {
      wx.showToast({ title: '录音组件未就绪', icon: 'none' });
      return;
    }
    const startedAt = Date.now();
    this.setData({
      recording: true,
      recordStartedAt: startedAt,
      recordDurationText: '00:00',
      audioPath: '',
      resultText: '',
      editableText: '',
      resultMeta: null,
      errorMessage: '',
      statusText: '正在录音，离开页面可能导致录音中断。'
    });
    this.startRecordTimer(startedAt);
    recorderManager.start({
      duration: MAX_RECORD_MS,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 96000,
      format: 'mp3'
    });
  },

  startRecordTimer(startedAt) {
    this.clearRecordTimer();
    recordTimer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      this.setData({ recordDurationText: formatDuration(elapsed) });
      if (elapsed >= MAX_RECORD_MS) {
        this.clearRecordTimer();
        wx.showToast({ title: '已到最长录音时长', icon: 'none' });
        this.stopRecord();
      }
    }, 1000);
  },

  clearRecordTimer() {
    if (recordTimer) {
      clearInterval(recordTimer);
      recordTimer = null;
    }
  },

  stopRecord() {
    if (recorderManager) recorderManager.stop();
  },

  transcribeAudio(audioPath) {
    if (!audioPath) {
      this.setData({
        errorMessage: '没有可转写的录音，请重新录制。',
        statusText: '录音文件不存在。'
      });
      return;
    }

    saveRecoverableDraft({ audioPath, status: 'transcribing' });
    this.setData({
      transcribing: true,
      errorMessage: '',
      statusText: '正在上传并转写，录音较长时会多等一会儿。'
    });

    asrTranscriber.transcribeAudio({ path: audioPath, format: 'mp3' })
      .then((result) => {
        const text = result && result.text ? result.text : '';
        const resultMeta = result ? {
          provider: result.provider || result.engine || '',
          engine: result.engine || result.provider || '',
          status: result.status || 'ok',
          confidence: result.confidence || 0,
          elapsedMs: result.elapsedMs || 0,
          durationMs: result.durationMs || 0,
          audioBytes: result.audioBytes || 0
        } : null;
        this.setData({
          resultText: text,
          editableText: text,
          resultMeta,
          transcribing: false,
          errorMessage: text ? '' : '没有识别到文字，可以重试或重新录制。',
          statusText: text ? '转写完成，可以先改一遍再使用。' : '这段录音没有识别出文字。'
        });
        saveRecoverableDraft({
          audioPath,
          resultText: text,
          resultMeta,
          status: text ? 'done' : 'empty'
        });
      })
      .catch((error) => {
        this.setData({
          transcribing: false,
          statusText: '转写失败，但录音已保留。',
          errorMessage: error && error.message ? error.message : '语音转写暂时不可用，录音已保留，可稍后重试。'
        });
        saveRecoverableDraft({
          audioPath,
          status: 'failed',
          errorMessage: error && error.message ? error.message : ''
        });
      });
  },

  retryTranscribe() {
    const audioPath = this.data.audioPath || (readRecoverableDraft() || {}).audioPath || '';
    if (!audioPath) {
      wx.showToast({ title: '没有可重试的录音', icon: 'none' });
      return;
    }
    this.transcribeAudio(audioPath);
  },

  onTextInput(event) {
    const value = event && event.detail ? event.detail.value : '';
    this.setData({
      editableText: value,
      resultText: value
    });
    saveRecoverableDraft({
      audioPath: this.data.audioPath,
      resultText: value,
      resultMeta: this.data.resultMeta || null,
      status: 'edited'
    });
  },

  confirmResult() {
    const text = String(this.data.editableText || this.data.resultText || '').trim();
    if (!text) {
      wx.showToast({ title: '暂无可用内容', icon: 'none' });
      return;
    }

    draftService.saveDraft(text, 'asr');
    wx.removeStorageSync(ASR_DRAFT_KEY);
    wx.navigateTo({ url: '/pages/transfer/editor?source=asr' });
  },

  goSmartEdit() {
    const text = String(this.data.editableText || this.data.resultText || '').trim();
    if (!text) {
      wx.showToast({ title: '暂无可用内容', icon: 'none' });
      return;
    }
    const that = this;
    quickActionsService.listQuickActions()
      .then(function (result) {
        var actions = result.quickActions || [];
        if (!actions.length) {
          wx.showToast({ title: '暂无可用的整理任务', icon: 'none' });
          return;
        }
        var titles = actions.map(function (a) { return a.title; });
        wx.showActionSheet({
          itemList: titles,
          success: function (res) {
            var selected = actions[res.tapIndex];
            if (!selected) return;
            that.setData({ transcribing: true });
            aiAssistant.generateContent({
              text: text,
              type: 'content_polish',
              actionId: selected.id
            }).then(function (aiResult) {
              var newText = aiResult.bodyText || aiResult.resultText || text;
              that.setData({
                editableText: newText,
                resultText: newText,
                transcribing: false
              });
            }).catch(function (error) {
              that.setData({ transcribing: false });
              wx.showToast({ title: error.message || 'AI整理暂时不可用', icon: 'none' });
            });
          }
        });
      })
      .catch(function () {
        wx.showToast({ title: '加载任务列表失败', icon: 'none' });
      });
  }
});
