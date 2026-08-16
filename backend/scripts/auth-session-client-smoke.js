var storage = { token: 'expired-token' };
var requestCount = 0;
var wechatLoginCount = 0;
var relaunchCount = 0;

global.wx = {
  getStorageSync: function (key) { return storage[key] || ''; },
  setStorageSync: function (key, value) { storage[key] = value; },
  removeStorageSync: function (key) { delete storage[key]; },
  login: function (options) { setTimeout(function () { options.success({ code: 'fresh-code' }); }, 0); },
  reLaunch: function () { relaunchCount += 1; }
};
global.getCurrentPages = function () { return [{ route: 'pages/home/home' }]; };

var clientPath = require.resolve('../../services/api/client');
require.cache[clientPath] = {
  id: clientPath,
  filename: clientPath,
  loaded: true,
  exports: {
    getBaseUrl: function () { return 'https://api.example.test'; },
    request: function (options) {
      requestCount += 1;
      if (options.url === '/api/auth/me') {
        if (!options.suppressAuthRedirect) throw new Error('session refresh must suppress immediate redirect');
        return Promise.reject({ code: 'AUTH_REQUIRED' });
      }
      if (options.url === '/api/auth/wechat-login') {
        wechatLoginCount += 1;
        return Promise.resolve({ token: 'fresh-token', user: { id: 'user-1' }, purchaseStatus: 'paid', deviceBindingStatus: 'bound' });
      }
      return Promise.reject(new Error('unexpected request: ' + options.url));
    }
  }
};

var devicePath = require.resolve('../../services/device/session');
require.cache[devicePath] = {
  id: devicePath,
  filename: devicePath,
  loaded: true,
  exports: { ensureActiveSession: function () { return Promise.resolve(null); }, clearDeviceSession: function () {} }
};

var session = require('../../services/auth/session');

Promise.all([session.refreshCurrentSession(), session.refreshCurrentSession()]).then(function (profiles) {
  if (requestCount !== 2 || wechatLoginCount !== 1) throw new Error('expired session refresh was not single-flight');
  if (profiles[0].token !== 'fresh-token' || storage.token !== 'fresh-token') throw new Error('silent WeChat re-login did not persist the new token');
  if (relaunchCount) throw new Error('successful silent re-login unexpectedly opened the login page');
  console.log('AUTH_SESSION_CLIENT_SMOKE_OK');
}).catch(function (error) {
  console.error(error.stack || error.message);
  process.exit(1);
});
