const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

const PORT = Number(process.env.ASR_WORKER_PORT || 9002);
const MAX_BODY_BYTES = Number(process.env.ASR_WORKER_MAX_BODY_BYTES || 100 * 1024 * 1024);
const COMMAND_TIMEOUT_MS = Number(process.env.ASR_COMMAND_TIMEOUT_MS || 10 * 60 * 1000);
const COMMAND_MAX_BUFFER = Number(process.env.ASR_COMMAND_MAX_BUFFER || 8 * 1024 * 1024);

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;
    let exceeded = false;
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
  const raw = String(value || '').trim();
  const match = raw.match(/^data:([^;]+);base64,(.*)$/);
  if (!match) {
    return { mimeType: '', base64: raw };
  }
  return { mimeType: match[1], base64: match[2] };
}

function extensionFor(format, mimeType) {
  const value = String(format || mimeType || '').toLowerCase();
  if (value.indexOf('wav') !== -1) return '.wav';
  if (value.indexOf('m4a') !== -1 || value.indexOf('mp4') !== -1) return '.m4a';
  if (value.indexOf('webm') !== -1) return '.webm';
  return '.mp3';
}

function parseCommandArgs(inputPath, format) {
  const raw = process.env.ASR_COMMAND_ARGS || '["{input}"]';
  let args;
  try {
    args = JSON.parse(raw);
  } catch (error) {
    throw new Error('ASR_COMMAND_ARGS must be a JSON array');
  }
  if (!Array.isArray(args)) {
    throw new Error('ASR_COMMAND_ARGS must be a JSON array');
  }
  return args.map((item) => String(item)
    .replace(/\{input\}/g, inputPath)
    .replace(/\{format\}/g, format || 'mp3'));
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    execFile(command, args, {
      timeout: COMMAND_TIMEOUT_MS,
      maxBuffer: COMMAND_MAX_BUFFER,
      windowsHide: true,
      encoding: 'buffer',
      env: Object.assign({}, process.env, {
        PYTHONIOENCODING: 'utf-8'
      })
    }, (error, stdout, stderr) => {
      const stdoutText = Buffer.isBuffer(stdout) ? stdout.toString('utf8') : String(stdout || '');
      const stderrText = Buffer.isBuffer(stderr) ? stderr.toString('utf8') : String(stderr || '');
      if (error) {
        const detail = stderrText ? stderrText.trim() : error.message;
        reject(new Error(detail || 'ASR command failed'));
        return;
      }
      resolve(stdoutText.trim());
    });
  });
}

function normalizeAsrOutput(stdout, format) {
  if (!stdout) {
    return { text: '', durationMs: 0, confidence: 0, format };
  }
  try {
    const data = JSON.parse(stdout);
    return {
      text: String(data.text || data.resultText || '').trim(),
      durationMs: Number(data.durationMs || 0),
      confidence: Number(data.confidence || 0),
      format: data.format || format
    };
  } catch (error) {
    return {
      text: stdout.trim(),
      durationMs: 0,
      confidence: 0,
      format
    };
  }
}

async function transcribeWithFreeEngine(audioBase64, format) {
  if (!audioBase64) {
    throw new Error('audioBase64 required');
  }

  const command = process.env.ASR_COMMAND || '';
  const provider = process.env.ASR_ENGINE || 'faster-whisper';
  if (!command) {
    return {
      provider,
      status: 'not_configured',
      text: '',
      durationMs: 0,
      confidence: 0,
      format: format || 'mp3'
    };
  }

  const parsed = parseDataUrl(audioBase64);
  const nextFormat = format || 'mp3';
  const inputPath = path.join(
    os.tmpdir(),
    'yisheng-asr-' + Date.now() + '-' + Math.random().toString(16).slice(2) +
      extensionFor(nextFormat, parsed.mimeType)
  );

  try {
    fs.writeFileSync(inputPath, Buffer.from(parsed.base64, 'base64'));
    const stdout = await runCommand(command, parseCommandArgs(inputPath, nextFormat));
    const result = normalizeAsrOutput(stdout, nextFormat);
    return {
      provider,
      status: 'ok',
      text: result.text,
      durationMs: result.durationMs,
      confidence: result.confidence,
      format: result.format || nextFormat
    };
  } finally {
    try {
      fs.unlinkSync(inputPath);
    } catch (error) {
      // Best-effort cleanup only; do not leak this into ASR responses.
    }
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    sendJson(res, 200, {
      ok: true,
      worker: 'asr',
      engine: process.env.ASR_ENGINE || 'faster-whisper',
      commandConfigured: Boolean(process.env.ASR_COMMAND)
    });
    return;
  }
  if (req.method !== 'POST' || req.url !== '/transcribe') {
    sendJson(res, 404, { error: 'not found' });
    return;
  }

  try {
    const body = await readBody(req);
    const result = await transcribeWithFreeEngine(body.audioBase64, body.format);
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
