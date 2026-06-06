const http = require('http');

const PORT = Number(process.env.ASR_WORKER_PORT || 9002);

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

async function transcribeWithFreeEngine(audioBase64, format) {
  if (!audioBase64) {
    throw new Error('audioBase64 required');
  }

  // Replace this function with faster-whisper invocation on Aliyun.
  // Keep the response shape stable so the main backend does not change.
  return {
    provider: process.env.ASR_ENGINE || 'faster-whisper',
    text: '',
    durationMs: 0,
    confidence: 0,
    format: format || 'mp3'
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    sendJson(res, 200, { ok: true, worker: 'asr' });
    return;
  }
  if (req.method !== 'POST' || req.url !== '/transcribe') {
    sendJson(res, 404, { error: 'not found' });
    return;
  }

  try {
    var body = await readBody(req);
    var result = await transcribeWithFreeEngine(body.audioBase64, body.format);
    sendJson(res, 200, result);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log('ASR worker listening on :' + PORT);
  });
}

module.exports = {
  transcribeWithFreeEngine,
  server
};
