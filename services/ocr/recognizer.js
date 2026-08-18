const { callMediaService } = require('../media-adapter');
const { ENDPOINTS } = require('../api/endpoints');

function normalizeResult(data) {
  const payload = data || {};
  const text = payload.text || payload.resultText || '';
  const lines = Array.isArray(payload.lines) ? payload.lines : [];
  return {
    provider: payload.provider || payload.engine || 'backend-ocr-gateway',
    engine: payload.engine || payload.provider || 'backend-ocr-gateway',
    status: payload.status || 'ok',
    text: text,
    lines: lines,
    charCount: Number(payload.charCount || text.length || 0),
    confidence: payload.confidence || 0,
    regions: Array.isArray(payload.regions) ? payload.regions : [],
    document: payload.document && typeof payload.document === 'object' ? payload.document : { documentType: 'unknown', reportDate: '', facts: [], uncertainRows: [] },
    elapsedMs: Number(payload.elapsedMs || 0),
    structureMs: Number(payload.structureMs || 0),
    imageBytes: Number(payload.imageBytes || 0),
    raw: payload
  };
}

var OCR_ERROR_MAP = {
  OCR_NOT_CONFIGURED: '图片取字服务尚未配置',
  API_BASE_URL_NOT_CONFIGURED: '后端服务地址尚未配置',
  OCR_IMAGE_REQUIRED: '请先选择图片',
  OCR_IMAGE_INVALID: '图片内容无效，请重新选择',
  OCR_IMAGE_TOO_LARGE: '图片过大，请压缩或重新拍摄',
  REQUEST_BODY_TOO_LARGE: '图片过大，请压缩或重新拍摄',
  OCR_WORKER_FAILED: '图片取字暂时不可用，请稍后重试',
  MEMBER_REQUIRED: '当前账号暂未开通该能力',
  DEVICE_CONNECTION_REQUIRED: '请先连接设备后再使用图片识别',
  DEVICE_NOT_BOUND: '设备绑定信息不一致，请重新连接蓝牙设备',
  DEVICE_SESSION_REQUIRED: '设备会话已失效，请重新连接蓝牙设备',
  DEVICE_SESSION_EXPIRED: '设备会话已过期，请重新连接蓝牙设备',
  DEVICE_SESSION_INVALID: '设备会话无效，请重新连接蓝牙设备',
  NETWORK_ERROR: '网络请求失败，请检查后端服务和网络连接'
};

function recognizeImage(imageFile) {
  return callMediaService({
    file: imageFile,
    engineSuffix: 'ocr',
    fileRequiredCode: 'OCR_IMAGE_REQUIRED',
    fileRequiredMessage: '请先选择图片',
    notConfiguredCode: 'OCR_NOT_CONFIGURED',
    notConfiguredMessage: '图片取字服务尚未配置',
    mockText: '这是本地测试识别结果。你可以继续编辑，或使用专业整理。',
    mockExtraFields: { regions: [], imageBytes: 0, lines: [{ index: 0, text: '这是本地测试识别结果。你可以继续编辑，或使用专业整理。', field: null }], charCount: 0 },
    fallbackErrorMessage: '图片取字暂时不可用',
    endpoint: ENDPOINTS.ocr.recognize,
    buildPayload: function (base64Data, file) {
      return {
        imageBase64: base64Data,
        source: file.source || 'mini_program',
        workspaceId: file.workspaceId || '',
        professional: file.professional === true,
        sourceId: file.sourceId || '',
        pageIndex: Number(file.pageIndex || 0)
        ,documentMode: file.documentMode || ''
      };
    },
    normalizeResult: normalizeResult,
    errorMap: OCR_ERROR_MAP
  });
}

module.exports = {
  recognizeImage: recognizeImage
};
