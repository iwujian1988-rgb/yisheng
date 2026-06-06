const { request, getBaseUrl } = require('../api/client');
const { ENDPOINTS } = require('../api/endpoints');

function readFileBase64(path) {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().readFile({
      filePath: path,
      encoding: 'base64',
      success(res) {
        resolve(res.data || '');
      },
      fail(err) {
        reject({
          code: 'ASR_FILE_READ_FAILED',
          message: '录音文件读取失败',
          raw: err
        });
      }
    });
  });
}

function createNotConfiguredError(audioFile) {
  return {
    code: 'ASR_NOT_CONFIGURED',
    message: 'ASR 服务尚未配置',
    inputSummary: {
      hasAudio: Boolean(audioFile && audioFile.path)
    }
  };
}

function normalizeResult(data) {
  const payload = data || {};
  return {
    provider: payload.provider || payload.engine || 'backend-asr-gateway',
    text: payload.text || payload.resultText || '',
    durationMs: payload.durationMs || 0,
    confidence: payload.confidence || 0,
    raw: payload
  };
}

function transcribeAudio(audioFile) {
  if (!audioFile || !audioFile.path) {
    return Promise.reject({
      code: 'ASR_AUDIO_REQUIRED',
      message: '请先完成录音'
    });
  }

  if (!getBaseUrl()) {
    return Promise.reject(createNotConfiguredError(audioFile));
  }

  return readFileBase64(audioFile.path).then((audioBase64) => {
    return request({
      url: ENDPOINTS.asr.transcribe,
      method: 'POST',
      data: {
        audioBase64,
        source: audioFile.source || 'mini_program',
        format: audioFile.format || 'mp3'
      }
    });
  }).then(normalizeResult);
}

module.exports = {
  transcribeAudio
};
