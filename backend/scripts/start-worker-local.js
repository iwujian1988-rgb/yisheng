const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const index = trimmed.indexOf('=');
    if (index <= 0) return;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

loadEnvFile(path.resolve(__dirname, '..', '.env.local'));

const workerName = process.argv[2];
if (workerName === 'ocr') {
  const { server } = require('../workers/ocr-worker.example');
  const port = Number(process.env.OCR_WORKER_PORT || 9001);
  server.listen(port, () => {
    console.log('OCR worker listening on :' + port);
  });
} else if (workerName === 'asr') {
  const { server } = require('../workers/asr-worker.example');
  const port = Number(process.env.ASR_WORKER_PORT || 9002);
  server.listen(port, () => {
    console.log('ASR worker listening on :' + port);
  });
} else {
  console.error('usage: node scripts/start-worker-local.js <ocr|asr>');
  process.exit(1);
}
