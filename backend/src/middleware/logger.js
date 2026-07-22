const { config } = require('../config');

let logger;
try {
  const pino = require('pino');
  logger = pino({
    level: process.env.LOG_LEVEL || (config.env === 'production' ? 'info' : 'debug'),
    base: {
      service: 'yisheng-backend',
      env: config.env,
      pid: process.pid
    },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["x-device-session"]',
        'req.headers["x-device-live"]',
        '*.password',
        '*.passwordHash',
        '*.sessionKey',
        '*.session_key'
      ],
      censor: '[redacted]'
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: function (label) { return { level: label }; }
    }
  });
} catch (_err) {
  // pino not installed — fall back to console so dev smoke tests still work
  logger = {
    _tag: 'console-fallback',
    _fmt: function (obj, msg) {
      try { return (msg || '') + ' ' + JSON.stringify(obj); } catch (_) { return msg || ''; }
    },
    trace: function (o, m) { /* silent */ },
    debug: function (o, m) { /* silent */ },
    info: function (o, m) { console.log('[info]', this._fmt(o, m)); },
    warn: function (o, m) { console.warn('[warn]', this._fmt(o, m)); },
    error: function (o, m) { console.error('[error]', this._fmt(o, m)); },
    fatal: function (o, m) { console.error('[fatal]', this._fmt(o, m)); process.exit(1); },
    child: function () { return logger; }
  };
}

function requestLogger(req, res, next) {
  var start = Date.now();
  res.on('finish', function () {
    var duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      durationMs: duration
    }, 'request');
  });
  if (typeof next === 'function') next();
}

module.exports = {
  logger: logger,
  requestLogger: requestLogger
};
