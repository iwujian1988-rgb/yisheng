const { config } = require('../config');
const { ok, fail } = require('../http');

let bootTime = Date.now();
let lastPersistError = null;
let storeRef = null;

function register(store) {
  storeRef = store;
  if (typeof store.lastPersistError === 'function') {
    setInterval(function () {
      lastPersistError = store.lastPersistError();
    }, 5000);
  }
}

function isStoreHealthy() {
  if (!storeRef) return true;
  if (config.storeMode !== 'mysql') return true;
  if (storeRef.ready && typeof storeRef.ready.then === 'function') {
    // Initial load promise; if rejected, store is not healthy
    // (we can't synchronously inspect — leave to ready probe)
    return true;
  }
  return true;
}

function isStoreMysqlReady() {
  if (!storeRef || !storeRef.ready) return true;
  return storeRef.__mysqlReady !== false;
}

function liveness(req, res) {
  // Liveness：进程能响应即 OK
  ok(res, {
    status: 'ok',
    uptime: Math.floor((Date.now() - bootTime) / 1000),
    env: config.env,
    storeMode: config.storeMode
  });
}

function readiness(req, res) {
  // Readiness：依赖（MySQL 初始加载、最近一次持久化）必须成功
  var checks = {
    uptime: Math.floor((Date.now() - bootTime) / 1000),
    storeMode: config.storeMode,
    storeReady: isStoreMysqlReady(),
    lastPersistError: lastPersistError ? lastPersistError.message : null
  };
  var ready = checks.storeReady && !lastPersistError;
  if (ready) {
    ok(res, Object.assign({ status: 'ready' }, checks));
  } else {
    fail(res, 503, 'NOT_READY', JSON.stringify(checks));
  }
}

module.exports = {
  register: register,
  liveness: liveness,
  readiness: readiness,
  _setBootTime: function (t) { bootTime = t; },
  _setLastPersistError: function (e) { lastPersistError = e; }
};
