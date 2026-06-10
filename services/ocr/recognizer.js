const { callMediaService } = require('../media-adapter');
const { ENDPOINTS } = require('../api/endpoints');

function normalizeResult(data) {
  const payload = data || {};
  return {
    provider: payload.provider || payload.engine || 'backend-ocr-gateway',
    engine: payload.engine || payload.provider || 'backend-ocr-gateway',
    status: payload.status || 'ok',
    text: payload.text || payload.resultText || '',
    confidence: payload.confidence || 0,
    regions: Array.isArray(payload.regions) ? payload.regions : [],
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
  NETWORK_ERROR: '网络请求失败，请检查后端服务'
};

function recognizeImage(imageFile) {
  return callMediaService({
    file: imageFile,
    engineSuffix: 'ocr',
    fileRequiredCode: 'OCR_IMAGE_REQUIRED',
    fileRequiredMessage: '请先选择图片',
    notConfiguredCode: 'OCR_NOT_CONFIGURED',
    notConfiguredMessage: '图片取字服务尚未配置',
    mockText: '这是一段本地测试识别结果。你可以继续编辑、套用模板，或发送到电脑。',
    mockExtraFields: { regions: [], imageBytes: 0 },
    fallbackErrorMessage: '图片取字暂时不可用',
    endpoint: ENDPOINTS.ocr.recognize,
    buildPayload: function (base64Data, file) {
      return {
        imageBase64: base64Data,
        source: file.source || 'mini_program'
      };
    },
    normalizeResult: normalizeResult,
    errorMap: OCR_ERROR_MAP
  });
}

module.exports = {
  recognizeImage: recognizeImage
};
