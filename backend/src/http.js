function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization,Content-Type'
  });
  res.end(JSON.stringify(payload));
}

function ok(res, data, message) {
  sendJson(res, 200, {
    code: 'OK',
    data: data === undefined ? null : data,
    message: message || ''
  });
}

function fail(res, statusCode, code, message, data) {
  sendJson(res, statusCode, {
    code: code,
    message: message || code,
    data: data === undefined ? null : data
  });
}

function sendText(res, statusCode, text, headers) {
  res.writeHead(statusCode, Object.assign({
    'Content-Type': 'text/plain; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  }, headers || {}));
  res.end(text);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    var chunks = [];
    req.on('data', (chunk) => {
      chunks.push(chunk);
    });
    req.on('end', () => {
      var raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error('INVALID_JSON'));
      }
    });
    req.on('error', reject);
  });
}

function getBearerToken(req) {
  var header = req.headers.authorization || '';
  if (header.indexOf('Bearer ') !== 0) return '';
  return header.slice(7).trim();
}

function getIp(req) {
  return req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
}

module.exports = {
  fail,
  getBearerToken,
  getIp,
  ok,
  parseBody,
  sendText,
  sendJson
};
