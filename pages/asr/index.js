const asrTranscriber = require('../../services/asr/transcriber');

let recorderManager = null;

Page({
  data: {
    recording: false,
    audioPath: '',
    resultText: '',
    transcribing: false,
    errorMessage: ''
  },

  onLoad() {
    recorderManager = wx.getRecorderManager();
    recorderManager.onStop((res) => {
      const audioPath = res && res.tempFilePath ? res.tempFilePath : '';
      this.setData({ recording: false, audioPath });
      this.transcribeAudio(audioPath);
    });
    recorderManager.onError((error) => {
      this.setData({
        recording: false,
        transcribing: false,
        errorMessage: error && error.errMsg ? error.errMsg : '录音失败'
      });
    });
  },

  toggleRecord() {
    if (this.data.recording) {
      this.stopRecord();
      return;
    }
    this.startRecord();
  },

  startRecord() {
    this.setData({
      recording: true,
      resultText: '',
      errorMessage: ''
    });
    recorderManager.start({
      duration: 60000,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 96000,
      format: 'mp3'
    });
  },

  stopRecord() {
    recorderManager.stop();
  },

  transcribeAudio(audioPath) {
    if (!audioPath) {
      this.setData({ errorMessage: '未获取到录音文件' });
      return;
    }

    this.setData({ transcribing: true, errorMessage: '' });

    asrTranscriber.transcribeAudio({ path: audioPath, format: 'mp3' })
      .then((result) => {
        this.setData({
          resultText: result && result.text ? result.text : '',
          transcribing: false,
          errorMessage: ''
        });
      })
      .catch((error) => {
        this.setData({
          transcribing: false,
          errorMessage: error && error.message ? error.message : 'ASR 服务暂不可用'
        });
      });
  },

  confirmResult() {
    if (!this.data.resultText) {
      wx.showToast({ title: '暂无可用内容', icon: 'none' });
      return;
    }

    wx.navigateTo({
      url: '/pages/asr/result?audioStatus=' + encodeURIComponent('录音已完成') + '&resultText=' + encodeURIComponent(this.data.resultText)
    });
  }
});
