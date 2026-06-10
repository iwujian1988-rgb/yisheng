const fs = require('fs');
const path = require('path');

const imagePath = process.argv[2];
const targetUrl = process.env.OCR_TEST_URL || process.env.OCR_WORKER_URL || 'http://127.0.0.1:9001/recognize';

function fileTypeFromPath(filePath) {
  const ext = path.extname(filePath).replace('.', '').toLowerCase();
  if (ext === 'jpeg') return 'jpg';
  return ext || 'jpg';
}

async function run() {
  if (!imagePath) {
    throw new Error('usage: node scripts/ocr-image-test.js <image-path>');
  }
  if (!fs.existsSync(imagePath)) {
    throw new Error('image file not found: ' + imagePath);
  }

  const imageBase64 = fs.readFileSync(imagePath).toString('base64');
  const startedAt = Date.now();
  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64,
      fileType: fileTypeFromPath(imagePath),
      source: 'gate_test_cli'
    })
  });
  const elapsedMs = Date.now() - startedAt;
  const body = await response.json();

  const payload = {
    statusCode: response.status,
    elapsedMs,
    url: targetUrl,
    result: body
  };

  console.log(JSON.stringify(payload, null, 2));

  if (!response.ok) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
