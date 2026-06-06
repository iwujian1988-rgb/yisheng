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
    message: 'OCR 服务尚未配置',
    inputSummary: {
      hasImage: Boolean(imageFile && imageFile.path)
    }
  };
}

function normalizeResult(data) {
  const payload = data || {};
  return {
    provider: payload.provider || payload.engine || 'backend-ocr-gateway',
    text: payload.text || payload.resultText || '',
    confidence: payload.confidence || 0,
    raw: payload
  };
}

function recognizeImage(imageFile) {
  if (!imageFile || !imageFile.path) {
    return Promise.reject({
      code: 'OCR_IMAGE_REQUIRED',
      message: '请先选择图片'
    });
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
        source: imageFile.source || 'mini_program'
      }
    });
  }).then(normalizeResult);
}

module.exports = {
  recognizeImage
};
