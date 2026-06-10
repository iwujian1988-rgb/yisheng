const { request, getBaseUrl } = require('../api/client');
const { ENDPOINTS } = require('../api/endpoints');

function isDevMediaMockEnabled() {
  const app = typeof getApp === 'function' ? getApp() : null;
  return Boolean(
    (app && app.globalData && app.globalData.enableMediaMockForDev) ||
    wx.getStorageSync('enableMediaMockForDev')
  );
}

function createMockResult(startedAt) {
  return {
    provider: 'local-dev-mock',
    engine: 'mock-asr',
    status: 'mock',
    text: '这是一段本地测试转写结果。你可以继续编辑、整理格式，或发送到电脑。',
    durationMs: 3000,
    confidence: 0.99,
    audioBytes: 0,
    elapsedMs: Date.now() - startedAt,
    raw: { mock: true }
  };
}

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
          message: '录音文件读取失败，请重新录制',
          raw: err
        });
      }
    });
  });
}

function createNotConfiguredError(audioFile) {
  return {
    code: 'ASR_NOT_CONFIGURED',
    message: '语音转写服务尚未配置',
    inputSummary: {
      hasAudio: Boolean(audioFile && audioFile.path)
    }
  };
}

function normalizeResult(data) {
  const payload = data || {};
  return {
    provider: payload.provider || payload.engine || 'backend-asr-gateway',
    engine: payload.engine || payload.provider || 'backend-asr-gateway',
    status: payload.status || 'ok',
    text: payload.text || payload.resultText || '',
    durationMs: payload.durationMs || 0,
    confidence: payload.confidence || 0,
    audioBytes: Number(payload.audioBytes || 0),
    raw: payload
  };
}

function isDeviceConnected() {
  const app = typeof getApp === 'function' ? getApp() : null;
  const globalData = app && app.globalData ? app.globalData : {};
  return Boolean(globalData.skipBluetoothForDev || globalData.deviceConnected);
}

function friendlyError(error) {
  const code = error && error.code ? error.code : '';
  const messageMap = {
    ASR_FILE_READ_FAILED: '录音文件读取失败，请重新录制',
    ASR_NOT_CONFIGURED: '语音转写服务尚未配置',
    API_BASE_URL_NOT_CONFIGURED: '后端服务地址尚未配置',
    MEMBER_REQUIRED: '当前账号暂未开通会员能力',
    DEVICE_CONNECTION_REQUIRED: '请先连接设备后再使用语音转写',
    ASR_AUDIO_REQUIRED: '请先完成录音',
    ASR_AUDIO_INVALID: '录音内容无效，请重新录制',
    ASR_AUDIO_TOO_LARGE: '录音文件过大，请缩短录音时长',
    REQUEST_BODY_TOO_LARGE: '录音文件过大，请缩短录音时长',
    ASR_WORKER_FAILED: '语音转写暂时不可用，录音已保留，可稍后重试',
    NETWORK_ERROR: '网络请求失败，请检查后端服务和网络连接'
  };
  return Object.assign({}, error || {}, {
    message: messageMap[code] || (error && error.message) || '语音转写暂时不可用，录音已保留，可稍后重试'
  });
}

function transcribeAudio(audioFile) {
  if (!audioFile || !audioFile.path) {
    return Promise.reject({
      code: 'ASR_AUDIO_REQUIRED',
      message: '请先完成录音'
    });
  }

  const startedAt = Date.now();
  if (isDevMediaMockEnabled()) {
    return Promise.resolve(createMockResult(startedAt));
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
        deviceConnected: isDeviceConnected(),
        source: audioFile.source || 'mini_program',
        format: audioFile.format || 'mp3'
      }
    });
  }).then((data) => {
    const result = normalizeResult(data);
    result.elapsedMs = Date.now() - startedAt;
    if (!result.text && result.status === 'not_configured') {
      return Promise.reject(createNotConfiguredError(audioFile));
    }
    return result;
  }).catch((error) => {
    return Promise.reject(friendlyError(error));
  });
}

module.exports = {
  transcribeAudio
};
