function getAppInstance() {
  return typeof getApp === 'function' ? getApp() : null;
}

function getBaseUrl() {
  const app = getAppInstance();
  return (app && app.globalData && app.globalData.baseUrl) || '';
}

function normalizeResponse(data) {
  if (data && Object.prototype.hasOwnProperty.call(data, 'data')) {
    return data.data;
  }
  return data;
}

function getToken() {
  return wx.getStorageSync('token') || '';
}

function notConfiguredError() {
  return Promise.reject({
    code: 'API_BASE_URL_NOT_CONFIGURED',
    message: '尚未配置后端服务地址'
  });
}

function request(options) {
  const config = options || {};
  const url = config.url;
  const method = config.method || 'GET';
  const data = config.data || {};
  const header = config.header || {};
  const token = getToken();
  const baseUrl = getBaseUrl();

  if (!baseUrl) {
    return notConfiguredError();
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: baseUrl + url,
      method,
      data,
      header: Object.assign({
        'Content-Type': 'application/json',
        Authorization: token ? 'Bearer ' + token : ''
      }, header),
      success(res) {
        const body = res.data || {};
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(normalizeResponse(body));
          return;
        }

        reject({
          code: body.code || 'HTTP_ERROR',
          statusCode: res.statusCode,
          message: body.message || '请求失败',
          raw: res
        });
      },
      fail(err) {
        reject({
          code: 'NETWORK_ERROR',
          message: '网络请求失败',
          raw: err
        });
      }
    });
  });
}

function uploadFile(options) {
  const config = options || {};
  const url = config.url;
  const filePath = config.filePath;
  const name = config.name || 'file';
  const formData = config.formData || {};
  const token = getToken();
  const baseUrl = getBaseUrl();

  if (!baseUrl) {
    return notConfiguredError();
  }

  if (!filePath) {
    return Promise.reject({
      code: 'UPLOAD_FILE_REQUIRED',
      message: '请选择要上传的文件'
    });
  }

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: baseUrl + url,
      filePath,
      name,
      formData,
      header: {
        Authorization: token ? 'Bearer ' + token : ''
      },
      success(res) {
        let body = {};
        try {
          body = res.data ? JSON.parse(res.data) : {};
        } catch (error) {
          reject({
            code: 'UPLOAD_RESPONSE_PARSE_ERROR',
            message: '上传响应解析失败',
            raw: res
          });
          return;
        }

        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(normalizeResponse(body));
          return;
        }

        reject({
          code: body.code || 'UPLOAD_HTTP_ERROR',
          statusCode: res.statusCode,
          message: body.message || '上传失败',
          raw: res
        });
      },
      fail(err) {
        reject({
          code: 'UPLOAD_NETWORK_ERROR',
          message: '上传请求失败',
          raw: err
        });
      }
    });
  });
}

module.exports = {
  getBaseUrl,
  request,
  uploadFile
};
