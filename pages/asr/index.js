const asrTranscriber = require('../../services/asr/transcriber');
const featureEntitlements = require('../../services/entitlements/features');
const draftService = require('../../services/content/draft');
const smartOrganize = require('../../services/agent/organize');

let recorderManager = null;
let recordTimer = null;
let chunkTimer = null;
let autosaveTimer = null;

const MAX_RECORD_MS = 60 * 60 * 1000;
// RecorderManager supports long recordings. Keep chunks comfortably below the
// platform limit so a normal recording is not stopped and restarted every few
// seconds on a real device.
const CHUNK_RECORD_MS = 9 * 60 * 1000;
const AUTOSAVE_MS = 30 * 1000;
const ASR_DRAFT_KEY = 'asrRecoverableDraft';
const AI_MEDIA_INPUT_DRAFT_KEY = 'aiMediaInputDraft';

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

function inferAudioFormat(path) {
  const match = String(path || '').toLowerCase().match(/\.([a-z0-9]+)(?:\?|$)/);
  const ext = match ? match[1] : '';
  if (ext === 'm4a' || ext === 'mp4') return 'm4a';
  if (ext === 'wav') return 'wav';
  if (ext === 'webm') return 'webm';
  if (ext === 'aac') return 'aac';
  return 'mp3';
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

function joinTranscript(current, incoming) {
  const left = String(current || '').trim();
  const right = String(incoming || '').trim();
  if (!right) return left;
  return left ? left + '\n' + right : right;
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
    transcribingCount: 0,
    segmentCount: 0,
    savedAtText: '',
    errorMessage: '',
    statusText: '点击录音开始，手动停止后转写；长录音会自动分段保存。',
    hasRecoverableAudio: false,
    returnToAi: false,
    returnWorkspaceId: ''
  },

  _shouldContinueRecording: false,
  _manualStop: false,
  _activeTranscribes: 0,

  onLoad(options) {
    var that = this;
    featureEntitlements.guardAiFeature('asr', '语音转文字').then(function (ok) {
      if (!ok) {
        wx.navigateBack({
          delta: 1,
          fail: () => wx.reLaunch({ url: '/pages/home/home' })
        });
        return;
      }

      that.setData({
        returnToAi: Boolean(options && options.returnTo === 'ai'),
        returnWorkspaceId: String(options && options.workspaceId || '')
      });
      that.restoreRecoverableDraft();
      that.setupRecorder();
      that.enableLeaveGuard();
      if (options && options.auto === '1') {
        setTimeout(() => {
          if (!that.data.recording && !that.data.transcribing) that.toggleRecord();
        }, 300);
      }
    });
  },

  onUnload() {
    this.persistDraft('unload');
    this.clearTimers();
    this._shouldContinueRecording = false;
    this._manualStop = true;
    if (this.data.recording && recorderManager) recorderManager.stop();
    if (recorderManager && this._recorderStopHandler && recorderManager.offStop) {
      recorderManager.offStop(this._recorderStopHandler);
    }
    if (recorderManager && this._recorderErrorHandler && recorderManager.offError) {
      recorderManager.offError(this._recorderErrorHandler);
    }
  },

  onHide() {
    this.persistDraft('hide');
  },

  setupRecorder() {
    recorderManager = wx.getRecorderManager();
    this._recorderStopHandler = (res) => {
      const audioPath = res && res.tempFilePath ? res.tempFilePath : '';
      const audioFormat = inferAudioFormat(audioPath);
      const durationMs = Math.min(Date.now() - this.data.recordStartedAt, MAX_RECORD_MS);

      if (!this._shouldContinueRecording) {
        this.clearRecordTimer();
        this.setData({
          recording: false,
          recordDurationText: formatDuration(durationMs)
        });
      }

      if (!audioPath) {
        this.setData({
          errorMessage: '没有拿到录音文件，请重新录制。',
          statusText: '录音没有保存成功。'
        });
        return;
      }

      saveRecoverableDraft({
        audioPath,
        audioFormat,
        durationMs,
        resultText: this.data.editableText || '',
        resultMeta: this.data.resultMeta || null,
        status: 'recorded'
      });
      this.setData({ audioPath, hasRecoverableAudio: true });

      if (this._shouldContinueRecording && !this._manualStop) {
        setTimeout(() => this.startSegment(), 120);
      }
      this.transcribeAudio(audioPath, audioFormat, true);
    };
    recorderManager.onStop(this._recorderStopHandler);

    this._recorderErrorHandler = (error) => {
      this.clearTimers();
      this._shouldContinueRecording = false;
      this.setData({
        recording: false,
        transcribing: false,
        statusText: '录音中断了，已保存当前草稿。',
        errorMessage: error && error.errMsg ? error.errMsg : '录音失败，请检查麦克风权限。'
      });
      this.persistDraft('error');
    };
    recorderManager.onError(this._recorderErrorHandler);
  },

  restoreRecoverableDraft() {
    const draft = readRecoverableDraft();
    if (!draft || (!draft.audioPath && !draft.resultText)) return;
    const updatedAt = draft.updatedAt ? new Date(draft.updatedAt) : null;
    this.setData({
      audioPath: draft.audioPath || '',
      audioFormat: draft.audioFormat || inferAudioFormat(draft.audioPath),
      resultText: draft.resultText || '',
      editableText: draft.resultText || '',
      resultMeta: draft.resultMeta || null,
      recordDurationText: formatDuration(draft.durationMs || 0),
      hasRecoverableAudio: Boolean(draft.audioPath),
      savedAtText: updatedAt ? this.formatSavedAt(updatedAt) : '',
      statusText: draft.resultText ? '已恢复上次草稿，可以继续录音或编辑。' : '检测到上次录音，可以继续转写。'
    });
  },

  toggleRecord() {
    if (this.data.recording) {
      this.stopRecord();
      return;
    }
    if (this.data.transcribing) {
      wx.showToast({ title: '上一段正在转写，请稍等', icon: 'none' });
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
                content: '开启麦克风权限后才能录音转写。',
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
    this._shouldContinueRecording = true;
    this._manualStop = false;
    // A tap on “录音” always starts a new recording material. Never append a
    // new visit/meeting to the transcript restored from the previous session.
    wx.removeStorageSync(ASR_DRAFT_KEY);
    this.setData({
      recording: true,
      recordStartedAt: startedAt,
      recordDurationText: '00:00',
      audioPath: '',
      audioFormat: '',
      resultText: '',
      editableText: '',
      resultMeta: null,
      segmentCount: 0,
      savedAtText: '',
      hasRecoverableAudio: false,
      errorMessage: '',
      statusText: '正在录音。停止后会自动转写，请保持小程序在前台。'
    });
    this.startRecordTimer(startedAt);
    this.startAutosaveTimer();
    this.startSegment();
  },

  startSegment() {
    if (!this._shouldContinueRecording || !recorderManager) return;
    try {
      recorderManager.start({
        duration: CHUNK_RECORD_MS,
        sampleRate: 16000,
        numberOfChannels: 1,
        encodeBitRate: 96000,
        format: 'mp3'
      });
      this.clearChunkTimer();
      chunkTimer = setTimeout(() => {
        if (this.data.recording && recorderManager) recorderManager.stop();
      }, CHUNK_RECORD_MS + 1500);
    } catch (error) {
      this.setData({
        errorMessage: '录音启动失败，请稍后重试。',
        statusText: '录音启动失败。'
      });
    }
  },

  startRecordTimer(startedAt) {
    this.clearRecordTimer();
    recordTimer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      this.setData({ recordDurationText: formatDuration(elapsed) });
      if (elapsed >= MAX_RECORD_MS) {
        wx.showToast({ title: '已到最长录音时长', icon: 'none' });
        this.stopRecord();
      }
    }, 1000);
  },

  startAutosaveTimer() {
    this.clearAutosaveTimer();
    autosaveTimer = setInterval(() => {
      this.persistDraft('autosave');
    }, AUTOSAVE_MS);
  },

  clearRecordTimer() {
    if (recordTimer) {
      clearInterval(recordTimer);
      recordTimer = null;
    }
  },

  clearChunkTimer() {
    if (chunkTimer) {
      clearTimeout(chunkTimer);
      chunkTimer = null;
    }
  },

  clearAutosaveTimer() {
    if (autosaveTimer) {
      clearInterval(autosaveTimer);
      autosaveTimer = null;
    }
  },

  clearTimers() {
    this.clearRecordTimer();
    this.clearChunkTimer();
    this.clearAutosaveTimer();
  },

  stopRecord() {
    this._manualStop = true;
    this._shouldContinueRecording = false;
    this.clearChunkTimer();
    this.clearAutosaveTimer();
    this.persistDraft('stop');
    if (recorderManager) recorderManager.stop();
    this.setData({
      statusText: '录音已停止，正在转写。'
    });
  },

  transcribeAudio(audioPath, audioFormat, appendMode) {
    if (!audioPath) {
      this.setData({
        errorMessage: '没有可转写的录音，请重新录制。',
        statusText: '录音文件不存在。'
      });
      return;
    }

    const nextFormat = audioFormat || inferAudioFormat(audioPath);
    this._activeTranscribes += 1;
    this.setData({
      transcribing: true,
      transcribingCount: this._activeTranscribes,
      errorMessage: '',
      statusText: this.data.recording ? '正在录音，并分段转写文字。' : '正在转写录音。'
    });

    saveRecoverableDraft({
      audioPath,
      audioFormat: nextFormat,
      status: 'transcribing',
      resultText: this.data.editableText || ''
    });

    asrTranscriber.transcribeAudio({ path: audioPath, format: nextFormat })
      .then((result) => {
        const text = result && result.text ? result.text : '';
        const nextText = appendMode ? joinTranscript(this.data.editableText, text) : text;
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
          resultText: nextText,
          editableText: nextText,
          resultMeta,
          segmentCount: this.data.segmentCount + 1,
          errorMessage: text ? '' : this.data.errorMessage,
          statusText: this.data.recording ? '正在录音，已追加最新转写。' : '转写完成，可以先修改再使用。'
        });
        this.persistDraft('transcribed');
      })
      .catch((error) => {
        this.setData({
          statusText: this.data.recording ? '部分转写失败，录音仍在继续。' : '转写失败，但草稿已保留。',
          errorMessage: error && error.message ? error.message : '语音转写暂时不可用，草稿已保留。'
        });
        this.persistDraft('failed');
      })
      .finally(() => {
        this._activeTranscribes = Math.max(0, this._activeTranscribes - 1);
        this.setData({
          transcribing: this._activeTranscribes > 0,
          transcribingCount: this._activeTranscribes
        });
      });
  },

  retryTranscribe() {
    const draft = readRecoverableDraft() || {};
    const audioPath = this.data.audioPath || draft.audioPath || '';
    if (!audioPath) {
      wx.showToast({ title: '没有可重试的录音', icon: 'none' });
      return;
    }
    this.transcribeAudio(audioPath, this.data.audioFormat || draft.audioFormat || inferAudioFormat(audioPath), false);
  },

  onTextInput(event) {
    const value = event && event.detail ? event.detail.value : '';
    this.setData({
      editableText: value,
      resultText: value
    });
    this.persistDraft('edited');
  },

  persistDraft(status) {
    const now = new Date();
    saveRecoverableDraft({
      audioPath: this.data.audioPath,
      audioFormat: this.data.audioFormat || inferAudioFormat(this.data.audioPath),
      durationMs: Date.now() - Number(this.data.recordStartedAt || Date.now()),
      resultText: this.data.editableText || this.data.resultText || '',
      resultMeta: this.data.resultMeta || null,
      status: status || 'draft'
    });
    this.setData({
      hasRecoverableAudio: Boolean(this.data.audioPath || this.data.editableText),
      savedAtText: this.formatSavedAt(now)
    });
    this.enableLeaveGuard();
  },

  formatSavedAt(date) {
    return '已保存 ' + String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
  },

  enableLeaveGuard() {
    if (typeof wx.enableAlertBeforeUnload !== 'function') return;
    wx.enableAlertBeforeUnload({
      message: '录音转写草稿已自动保存，离开后可再次进入恢复。'
    });
  },

  disableLeaveGuard() {
    if (typeof wx.disableAlertBeforeUnload === 'function') {
      wx.disableAlertBeforeUnload();
    }
  },

  confirmResult() {
    const text = String(this.data.editableText || this.data.resultText || '').trim();
    if (!text) {
      wx.showToast({ title: '暂无可用内容', icon: 'none' });
      return;
    }

    this.disableLeaveGuard();
    if (this.data.returnToAi) {
      wx.setStorageSync(AI_MEDIA_INPUT_DRAFT_KEY, {
        id: 'voice-' + Date.now() + '-' + Math.floor(Math.random() * 100000),
        text,
        source: 'asr',
        durationText: this.data.recordDurationText || '',
        workspaceId: this.data.returnWorkspaceId || '',
        updatedAt: new Date().toISOString()
      });
      wx.removeStorageSync(ASR_DRAFT_KEY);
      wx.navigateBack({ delta: 1 });
      return;
    }

    draftService.saveDraft(text, 'asr');
    wx.removeStorageSync(ASR_DRAFT_KEY);
    wx.navigateTo({ url: '/pages/transfer/editor?source=asr' });
  },

  goSmartEdit() {
    if (this.data.returnToAi) return;

    const text = String(this.data.editableText || this.data.resultText || '').trim();
    if (!text) {
      wx.showToast({ title: '暂无可用内容', icon: 'none' });
      return;
    }

    this.setData({ transcribing: true });
    smartOrganize.runSmartOrganize(text)
      .then((aiResult) => {
        const newText = aiResult.bodyText || aiResult.resultText || text;
        this.setData({
          editableText: newText,
          resultText: newText,
          transcribing: false
        });
        this.persistDraft('edited');
      })
      .catch((error) => {
        this.setData({ transcribing: false });
        wx.showToast({ title: error.message || '智能整理失败', icon: 'none' });
      });
  }
});
