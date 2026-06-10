const { recognizeWithFreeEngine } = require('../workers/ocr-worker.example');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  delete process.env.OCR_COMMAND;
  process.env.OCR_ENGINE = 'paddleocr';

  const unconfigured = await recognizeWithFreeEngine('AA==', { fileType: 'png' });
  assert(unconfigured.status === 'not_configured', 'worker should report not_configured without OCR_COMMAND');
  assert(unconfigured.text === '', 'unconfigured worker should not return fake text');

  process.env.OCR_ENGINE = 'fake-ocr';
  process.env.OCR_COMMAND = process.execPath;
  process.env.OCR_COMMAND_ARGS = JSON.stringify([
    '-e',
    [
      'const fs=require("fs");',
      'if(!fs.existsSync(process.argv[1])) process.exit(2);',
      'console.log(JSON.stringify({text:"adapter ok",confidence:0.88,regions:[{box:[[0,0]],text:"adapter ok",confidence:0.88}]}));'
    ].join(' '),
    '{input}'
  ]);

  const configured = await recognizeWithFreeEngine('AA==', { fileType: 'png' });
  assert(configured.status === 'ok', 'configured worker should return ok');
  assert(configured.provider === 'fake-ocr', 'configured worker should preserve provider');
  assert(configured.text === 'adapter ok', 'configured worker should parse text');
  assert(configured.confidence === 0.88, 'configured worker should parse confidence');
  assert(Array.isArray(configured.regions) && configured.regions.length === 1, 'configured worker should parse regions');

  console.log('OCR_WORKER_SMOKE_OK');
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
