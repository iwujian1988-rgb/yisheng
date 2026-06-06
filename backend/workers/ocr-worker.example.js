const http = require('http');

const PORT = Number(process.env.OCR_WORKER_PORT || 9001);

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    var chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

async function recognizeWithFreeEngine(imageBase64) {
  if (!imageBase64) {
    throw new Error('imageBase64 required');
  }

  // Replace this function with PaddleOCR/RapidOCR invocation on Aliyun.
  // Keep the response shape stable so the main backend does not change.
  return {
    provider: process.env.OCR_ENGINE || 'paddleocr',
    text: '',
    confidence: 0
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    sendJson(res, 200, { ok: true, worker: 'ocr' });
    return;
  }
  if (req.method !== 'POST' || req.url !== '/recognize') {
    sendJson(res, 404, { error: 'not found' });
    return;
  }

  try {
    var body = await readBody(req);
    var result = await recognizeWithFreeEngine(body.imageBase64);
    sendJson(res, 200, result);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log('OCR worker listening on :' + PORT);
  });
}

module.exports = {
  recognizeWithFreeEngine,
  server
};
