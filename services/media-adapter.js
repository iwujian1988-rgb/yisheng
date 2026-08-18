const { request, getBaseUrl } = require('./api/client');

function isDevMediaMockEnabled() {
  const app = typeof getApp === 'function' ? getApp() : null;
  return Boolean(
    (app && app.globalData && app.globalData.enableMediaMockForDev) ||
    wx.getStorageSync('enableMediaMockForDev')
  );
}

function readFileBase64(path) {
  return new Promise(function (resolve, reject) {
    wx.getFileSystemManager().readFile({
      filePath: path,
      encoding: 'base64',
      success: function (res) { resolve(res.data || ''); },
      fail: function (err) { reject(err); }
    });
  });
}

function callMediaService(config) {
  var file = config.file;
  var startedAt = Date.now();

  if (!file || !file.path) {
    return Promise.reject({
      code: config.fileRequiredCode || 'MEDIA_FILE_REQUIRED',
      message: config.fileRequiredMessage || '请先选择文件'
    });
  }

  if (isDevMediaMockEnabled()) {
    return Promise.resolve(Object.assign({
      provider: 'local-dev-mock',
      engine: 'mock-' + (config.engineSuffix || 'media'),
      status: 'mock',
      text: config.mockText || '本地测试结果。',
      elapsedMs: Date.now() - startedAt,
      confidence: 0.99,
      raw: { mock: true }
    }, config.mockExtraFields || {}));
  }

  if (!getBaseUrl()) {
    return Promise.reject({
      code: config.notConfiguredCode || 'MEDIA_NOT_CONFIGURED',
      message: config.notConfiguredMessage || '服务尚未配置',
      inputSummary: { hasFile: Boolean(file && file.path) }
    });
  }

  return readFileBase64(file.path).then(function (base64Data) {
    return request({
      url: config.endpoint,
      method: 'POST',
      data: config.buildPayload(base64Data, file)
    });
  }).then(function (data) {
    var result = config.normalizeResult(data);
    var totalMs = Date.now() - startedAt;
    result.providerMs = Number(result.elapsedMs || 0);
    result.requestMs = totalMs;
    result.uploadMs = Math.max(0, totalMs - result.providerMs - Number(result.structureMs || 0));
    result.elapsedMs = totalMs;
    if (!result.text && result.status === 'not_configured') {
      return Promise.reject({
        code: config.notConfiguredCode || 'MEDIA_NOT_CONFIGURED',
        message: config.notConfiguredMessage || '服务尚未配置',
        inputSummary: { hasFile: Boolean(file && file.path) }
      });
    }
    return result;
  }).catch(function (error) {
    var code = error && error.code ? error.code : '';
    var messageMap = config.errorMap || {};
    return Promise.reject(Object.assign({}, error || {}, {
      message: messageMap[code] || (error && error.message) || config.fallbackErrorMessage || '服务暂时不可用'
    }));
  });
}

module.exports = {
  isDevMediaMockEnabled: isDevMediaMockEnabled,
  readFileBase64: readFileBase64,
  callMediaService: callMediaService
};
