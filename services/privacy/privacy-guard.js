function ensurePrivacyAuthorize() {
  return new Promise(function (resolve, reject) {
    if (typeof wx === 'undefined' || typeof wx.requirePrivacyAuthorize !== 'function') {
      resolve(true);
      return;
    }
    wx.requirePrivacyAuthorize({
      success: function () { resolve(true); },
      fail: function (err) {
        reject({
          code: 'PRIVACY_NOT_AUTHORIZED',
          message: '需要同意隐私协议后才能使用此功能',
          raw: err
        });
      }
    });
  });
}

function onPrivacyAuthorizationChange(cb) {
  if (typeof wx === 'undefined' || typeof wx.onNeedPrivacyAuthorization !== 'function') {
    return function () {};
  }
  wx.onNeedPrivacyAuthorization(function (resolve, eventInfo) {
    cb(eventInfo).then(resolve, resolve);
  });
  return function () {};
}

function wrapSensitiveApi(apiName, options) {
  return ensurePrivacyAuthorize().then(function () {
    return new Promise(function (resolve, reject) {
      if (typeof wx === 'undefined' || typeof wx[apiName] !== 'function') {
        reject({ code: 'API_UNAVAILABLE', message: apiName + ' 不可用' });
        return;
      }
      wx[apiName](Object.assign({}, options || {}, {
        success: resolve,
        fail: function (err) { reject({ code: 'API_FAILED', message: err.errMsg || '调用失败', raw: err }); }
      }));
    });
  });
}

function chooseImage(options) {
  return wrapSensitiveApi('chooseImage', options);
}

function chooseMedia(options) {
  return wrapSensitiveApi('chooseMedia', options);
}

function getLocation(options) {
  return wrapSensitiveApi('getLocation', options);
}

function startRecord(options) {
  return wrapSensitiveApi('startRecord', options);
}

module.exports = {
  ensurePrivacyAuthorize: ensurePrivacyAuthorize,
  onPrivacyAuthorizationChange: onPrivacyAuthorizationChange,
  wrapSensitiveApi: wrapSensitiveApi,
  chooseImage: chooseImage,
  chooseMedia: chooseMedia,
  getLocation: getLocation,
  startRecord: startRecord
};
