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
    engine: 'mock-ocr',
    status: 'mock',
    text: '这是一段本地测试识别结果。你可以继续编辑、套用模板，或发送到电脑。',
    confidence: 0.99,
    regions: [],
    imageBytes: 0,
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
          code: 'OCR_FILE_READ_FAILED',
          message: '图片读取失败',
          raw: err
        });
      }
    });
  });
}

function createNotConfiguredError(imageFile) {
  return {
    code: 'OCR_NOT_CONFIGURED',
    message: '图片取字服务尚未配置',
    inputSummary: {
      hasImage: Boolean(imageFile && imageFile.path)
    }
  };
}

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

function isDeviceConnected() {
  const app = typeof getApp === 'function' ? getApp() : null;
  const globalData = app && app.globalData ? app.globalData : {};
  return Boolean(globalData.skipBluetoothForDev || globalData.deviceConnected);
}

function friendlyError(error) {
  const code = error && error.code ? error.code : '';
  const messageMap = {
    OCR_NOT_CONFIGURED: '图片取字服务尚未配置',
    API_BASE_URL_NOT_CONFIGURED: '后端服务地址尚未配置',
    OCR_IMAGE_REQUIRED: '请先选择图片',
    OCR_IMAGE_INVALID: '图片内容无效，请重新选择',
    OCR_IMAGE_TOO_LARGE: '图片过大，请压缩或重新拍摄',
    REQUEST_BODY_TOO_LARGE: '图片过大，请压缩或重新拍摄',
    OCR_WORKER_FAILED: '图片取字暂时不可用，请稍后重试',
    NETWORK_ERROR: '网络请求失败，请检查后端服务'
  };
  return Object.assign({}, error || {}, {
    message: messageMap[code] || (error && error.message) || '图片取字暂时不可用'
  });
}

function recognizeImage(imageFile) {
  if (!imageFile || !imageFile.path) {
    return Promise.reject({
      code: 'OCR_IMAGE_REQUIRED',
      message: '请先选择图片'
    });
  }

  const startedAt = Date.now();
  if (isDevMediaMockEnabled()) {
    return Promise.resolve(createMockResult(startedAt));
  }

  if (!getBaseUrl()) {
    return Promise.reject(createNotConfiguredError(imageFile));
  }

  return readFileBase64(imageFile.path).then((imageBase64) => {
    return request({
      url: ENDPOINTS.ocr.recognize,
      method: 'POST',
      data: {
        imageBase64,
        deviceConnected: isDeviceConnected(),
        source: imageFile.source || 'mini_program'
      }
    });
  }).then((data) => {
    const result = normalizeResult(data);
    result.elapsedMs = Date.now() - startedAt;
    if (!result.text && result.status === 'not_configured') {
      return Promise.reject(createNotConfiguredError(imageFile));
    }
    return result;
  }).catch((error) => {
    return Promise.reject(friendlyError(error));
  });
}

module.exports = {
  recognizeImage
};
