const { spawnSync } = require('child_process');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

function run(label, command, args, options) {
  const result = spawnSync(command, args, Object.assign({
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
    shell: false
  }, options || {}));
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(label + ' failed');
  }
  console.log(label + '_OK');
}

function runNodeEval(label, code, env) {
  run(label, process.execPath, ['-e', code], {
    env: Object.assign({}, process.env, env || {})
  });
}

function main() {
  run('NODE_CHECK_ADMIN_UI', process.execPath, ['--check', 'backend/public/admin/app.js']);
  run('NODE_CHECK_API_CLIENT', process.execPath, ['--check', 'services/api/client.js']);
  run('NODE_CHECK_NETWORK_TEST', process.execPath, ['--check', 'services/diagnostics/network-test.js']);
  run('NODE_CHECK_BACKEND_HEALTH_PAGE', process.execPath, ['--check', 'pages/backend/health-check.js']);
  run('NODE_CHECK_DEVICE_PAGE', process.execPath, ['--check', 'pages/device/device.js']);
  run('NODE_CHECK_DEVICE_DETAIL_PAGE', process.execPath, ['--check', 'pages/device/detail.js']);
  run('NODE_CHECK_ADMIN_DEVICE_DETAIL_PAGE', process.execPath, ['--check', 'pages/admin/device-detail.js']);
  run('NODE_CHECK_ADMIN_FEEDBACK_DETAIL_PAGE', process.execPath, ['--check', 'pages/admin/feedback-detail.js']);
  run('NODE_CHECK_SUPPORT_PAGE', process.execPath, ['--check', 'pages/support/index.js']);
  run('NODE_CHECK_TEMPLATE_CATALOG', process.execPath, ['--check', 'services/templates/catalog.js']);
  run('NODE_CHECK_TEMPLATE_DETAIL_PAGE', process.execPath, ['--check', 'pages/templates/detail.js']);
  run('NODE_CHECK_TEMPLATE_RESULT_PAGE', process.execPath, ['--check', 'pages/templates/result.js']);
  run('NODE_CHECK_TRANSFER_CONFIRM_PAGE', process.execPath, ['--check', 'pages/transfer/confirm.js']);
  run('NODE_CHECK_PURCHASE_PAGE', process.execPath, ['--check', 'pages/purchase/index.js']);
  run('NODE_CHECK_HELP_PAGE', process.execPath, ['--check', 'pages/help/help.js']);
  run('NODE_CHECK_ADMIN_SETTINGS_PAGE', process.execPath, ['--check', 'pages/admin/settings.js']);
  run('NODE_CHECK_OPS_TICKET_DETAIL_PAGE', process.execPath, ['--check', 'pages/ops/ticket-detail.js']);
  run('NODE_CHECK_CUSTOMER_ALERT_PAGES', process.execPath, ['--check', 'pages/customer/transfer-alert.js']);
  run('SMOKE', process.execPath, ['backend/scripts/smoke.js']);
  run('TRIAL_FLOW_SMOKE', process.execPath, ['backend/scripts/trial-flow-smoke.js']);
  run('OCR_WORKER_SMOKE', process.execPath, ['backend/scripts/ocr-worker-smoke.js']);
  runNodeEval('ROUTES', [
    "const fs=require('fs');",
    "const app=JSON.parse(fs.readFileSync('app.json','utf8'));",
    "const missing=[];",
    "for (const p of app.pages) for (const ext of ['.js','.json','.wxml']) if (!fs.existsSync(p+ext)) missing.push(p+ext);",
    "if (missing.length) { console.log(JSON.stringify(missing,null,2)); process.exit(1); }",
    "console.log('pages', app.pages.length);"
  ].join(' '));
  runNodeEval('PROD_FILE_STORE_GUARD', [
    "try {",
    "require('./backend/src/store/create-store').createStore();",
    "console.error('production file store unexpectedly allowed');",
    "process.exit(1);",
    "} catch (error) {",
    "if (!String(error.message).includes('STORE_MODE=file is disabled in production')) throw error;",
    "}"
  ].join(' '), {
    NODE_ENV: 'production',
    STORE_MODE: 'file'
  });
  runNodeEval('ADMIN_ASSET', [
    "const {server}=require('./backend/src/server');",
    "const port=18183;",
    "const base='http://127.0.0.1:'+port;",
    "async function main(){",
    "const html=await fetch(base+'/admin').then(r=>r.text());",
    "const js=await fetch(base+'/admin/app.js').then(r=>r.text());",
    "if(!html.includes('文本传输助手管理后台')) throw new Error('admin html missing title');",
    "if(!js.includes('/api/admin/devices/import')) throw new Error('admin js missing device import');",
    "}",
    "server.listen(port,'127.0.0.1',()=>main().then(()=>server.close()).catch((error)=>{console.error(error.message); server.close(()=>process.exit(1));}));"
  ].join(' '), {
    STORE_MODE: 'memory',
    PORT: '18183'
  });
  console.log('RELEASE_CHECK_OK');
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
