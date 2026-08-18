const fs = require('fs');
const path = require('path');

require('../src/config');
const { config } = require('../src/config');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function mimeFor(filePath) {
  return path.extname(filePath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
}

async function main() {
  const filePath = path.resolve(process.argv[2] || '');
  assert(fs.existsSync(filePath), 'image path required');
  assert(config.dashscopeApiKey, 'DASHSCOPE_API_KEY is not configured');
  const endpoint = config.ocrCloudBaseUrl.replace(/\/$/, '')
    + '/api/v1/services/aigc/multimodal-generation/generation';
  const promptMode = process.argv.includes('--prompt');
  const payload = {
    model: promptMode ? (process.argv.includes('--fast') ? 'qwen3.5-flash' : process.argv.includes('--flash') ? 'qwen3-vl-flash' : 'qwen3-vl-plus') : config.ocrCloudModel,
    input: {
      messages: [{
        role: 'user',
        content: [{
          image: 'data:' + mimeFor(filePath) + ';base64,' + fs.readFileSync(filePath).toString('base64'),
          min_pixels: promptMode ? 65536 : 3072,
          max_pixels: 8388608,
          enable_rotate: false
        }].concat(promptMode ? [{
          text: 'Read this laboratory report from the image pixels. Return JSON only with keys dates, metadata, rows. rows must be an array in visual row order. Every row must contain rowNumber, code, name, result, flag, unit, referenceRange. Preserve empty cells as empty strings. Bind each cell only to the same visual row; never shift a neighboring row value into an empty cell. dates must preserve the exact printed date label such as 申请日期、报告日期、采样日期. Do not infer or normalize missing values.'
        }] : [])
      }]
    },
    parameters: promptMode ? { max_tokens: 6000 } : {
      ocr_options: {
        task: 'key_information_extraction',
        task_config: {
          result_schema: {
            document_dates: 'Extract every date with its exact printed label, for example application date, sample date, report date or test date.',
            patient_metadata: 'Extract printed patient name, sex, age, registration/inpatient/outpatient number, department, ward, bed number and specimen type. Keep empty fields empty.',
            laboratory_rows: 'Extract every laboratory row in visual row order as an array. Each row must contain row number, code, item name, result, abnormal marker, unit and reference range. Preserve empty cells as empty strings. Never shift a neighboring row cell into an empty cell.'
          }
        }
      }
    }
  };
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + config.dashscopeApiKey },
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  assert(response.ok, result.message || 'OCR KIE request failed');
  const outputDir = path.resolve(process.cwd(), '.tmp', 'real-quality');
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'kie-' + path.basename(filePath) + '.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');
  const content = (((result.output || {}).choices || [])[0] || {}).message;
  console.log(JSON.stringify({ status: 'ok', outputPath, hasContent: Boolean(content && content.content) }));
}

main().catch((error) => {
  console.error('OCR_KIE_QUALITY_EVAL_FAILED');
  console.error(error.message);
  process.exitCode = 1;
});
