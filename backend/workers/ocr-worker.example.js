const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

const PORT = Number(process.env.OCR_WORKER_PORT || 9001);
const MAX_BODY_BYTES = Number(process.env.OCR_WORKER_MAX_BODY_BYTES || 10 * 1024 * 1024);
const COMMAND_TIMEOUT_MS = Number(process.env.OCR_COMMAND_TIMEOUT_MS || 30000);
const COMMAND_MAX_BUFFER = Number(process.env.OCR_COMMAND_MAX_BUFFER || 2 * 1024 * 1024);

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    var chunks = [];
    var totalBytes = 0;
    var exceeded = false;
    req.on('data', (chunk) => {
      if (exceeded) return;
      totalBytes += chunk.length;
      if (totalBytes > MAX_BODY_BYTES) {
        exceeded = true;
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (exceeded) {
        reject(new Error('request body too large'));
        return;
      }
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function parseDataUrl(value) {
  var raw = String(value || '').trim();
  var match = raw.match(/^data:([^;]+);base64,(.*)$/);
  if (!match) {
    return { mimeType: '', base64: raw };
  }
  return { mimeType: match[1], base64: match[2] };
}

function extensionFor(fileType, mimeType) {
  var value = String(fileType || mimeType || '').toLowerCase();
  if (value.indexOf('webp') !== -1) return '.webp';
  if (value.indexOf('png') !== -1) return '.png';
  if (value.indexOf('jpeg') !== -1 || value.indexOf('jpg') !== -1) return '.jpg';
  return '.jpg';
}

function parseCommandArgs(inputPath) {
  var raw = process.env.OCR_COMMAND_ARGS || '["{input}"]';
  var args;
  try {
    args = JSON.parse(raw);
  } catch (error) {
    throw new Error('OCR_COMMAND_ARGS must be a JSON array');
  }
  if (!Array.isArray(args)) {
    throw new Error('OCR_COMMAND_ARGS must be a JSON array');
  }
  return args.map((item) => String(item).replace(/\{input\}/g, inputPath));
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    execFile(command, args, {
      timeout: COMMAND_TIMEOUT_MS,
      maxBuffer: COMMAND_MAX_BUFFER,
      encoding: 'buffer',
      windowsHide: true
    }, (error, stdout, stderr) => {
      if (error) {
        var detail = stderr ? Buffer.from(stderr).toString('utf8').trim() : error.message;
        reject(new Error(detail || 'OCR command failed'));
        return;
      }
      resolve(Buffer.from(stdout || Buffer.alloc(0)).toString('utf8').trim());
    });
  });
}

function normalizeOcrOutput(stdout) {
  if (!stdout) {
    return { text: '', confidence: 0, regions: [] };
  }
  try {
    var data = JSON.parse(stdout);
    return {
      text: String(data.text || data.resultText || '').trim(),
      confidence: Number(data.confidence || 0),
      regions: Array.isArray(data.regions) ? data.regions : []
    };
  } catch (error) {
    return {
      text: stdout.trim(),
      confidence: 0,
      regions: []
    };
  }
}

async function recognizeWithFreeEngine(imageBase64, options) {
  if (!imageBase64) {
    throw new Error('imageBase64 required');
  }

  var command = process.env.OCR_COMMAND || '';
  var provider = process.env.OCR_ENGINE || 'paddleocr';
  if (!command) {
    return {
      provider,
      status: 'not_configured',
      text: '',
      confidence: 0,
      regions: []
    };
  }

  var parsed = parseDataUrl(imageBase64);
  var inputPath = path.join(
    os.tmpdir(),
    'yisheng-ocr-' + Date.now() + '-' + Math.random().toString(16).slice(2) +
      extensionFor(options && options.fileType, options && options.mimeType || parsed.mimeType)
  );
  try {
    fs.writeFileSync(inputPath, Buffer.from(parsed.base64, 'base64'));
    var stdout = await runCommand(command, parseCommandArgs(inputPath));
    var result = normalizeOcrOutput(stdout);
    return {
      provider,
      status: 'ok',
      text: result.text,
      confidence: result.confidence,
      regions: result.regions
    };
  } finally {
    try {
      fs.unlinkSync(inputPath);
    } catch (error) {
      // Best-effort cleanup only; do not leak this into OCR responses.
    }
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    sendJson(res, 200, {
      ok: true,
      worker: 'ocr',
      engine: process.env.OCR_ENGINE || 'paddleocr',
      commandConfigured: Boolean(process.env.OCR_COMMAND)
    });
    return;
  }
  if (req.method !== 'POST' || req.url !== '/recognize') {
    sendJson(res, 404, { error: 'not found' });
    return;
  }

  try {
    var body = await readBody(req);
    var result = await recognizeWithFreeEngine(body.imageBase64, {
      fileType: body.fileType,
      mimeType: body.mimeType
    });
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
