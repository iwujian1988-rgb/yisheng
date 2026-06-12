const { callMediaService } = require('../media-adapter');
const { ENDPOINTS } = require('../api/endpoints');

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

var ASR_ERROR_MAP = {
  ASR_FILE_READ_FAILED: '录音文件读取失败，请重新录制',
  ASR_NOT_CONFIGURED: '语音转写服务尚未配置',
  API_BASE_URL_NOT_CONFIGURED: '后端服务地址尚未配置',
  MEMBER_REQUIRED: '当前账号暂未开通该能力',
  DEVICE_CONNECTION_REQUIRED: '请先连接设备后再使用语音转文字',
  ASR_AUDIO_REQUIRED: '请先完成录音',
  ASR_AUDIO_INVALID: '录音内容无效，请重新录制',
  ASR_AUDIO_TOO_LARGE: '录音文件过大，请缩短录音时长',
  REQUEST_BODY_TOO_LARGE: '录音文件过大，请缩短录音时长',
  ASR_WORKER_FAILED: '语音转写暂时不可用，录音已保留，可以稍后重试',
  NETWORK_ERROR: '网络请求失败，请检查后端服务和网络连接'
};

function transcribeAudio(audioFile) {
  return callMediaService({
    file: audioFile,
    engineSuffix: 'asr',
    fileRequiredCode: 'ASR_AUDIO_REQUIRED',
    fileRequiredMessage: '请先完成录音',
    notConfiguredCode: 'ASR_NOT_CONFIGURED',
    notConfiguredMessage: '语音转写服务尚未配置',
    mockText: '这是本地测试转写结果。你可以继续编辑，或使用专业整理。',
    mockExtraFields: { durationMs: 3000, audioBytes: 0 },
    fallbackErrorMessage: '语音转写暂时不可用，录音已保留，可以稍后重试',
    endpoint: ENDPOINTS.asr.transcribe,
    buildPayload: function (base64Data, file) {
      return {
        audioBase64: base64Data,
        source: file.source || 'mini_program',
        format: file.format || 'mp3'
      };
    },
    normalizeResult: normalizeResult,
    errorMap: ASR_ERROR_MAP
  });
}

module.exports = {
  transcribeAudio: transcribeAudio
};
