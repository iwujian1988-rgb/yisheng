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
  run('NODE_CHECK_AGENT_CHAT_CLIENT', process.execPath, ['--check', 'services/agent/chat.js']);
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
  run('NODE_CHECK_PURCHASE_CLAIM_PAGE', process.execPath, ['--check', 'pages/purchase/claim.js']);
  run('NODE_CHECK_ORDER_ENTITLEMENTS', process.execPath, ['--check', 'backend/src/modules/order-entitlements.js']);
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
  runNodeEval('SUBMISSION_SURFACE', [
    "const fs=require('fs');",
    "const app=JSON.parse(fs.readFileSync('app.json','utf8'));",
    "const project=JSON.parse(fs.readFileSync('project.config.json','utf8'));",
    "const allowed=['pages/customer','pages/legal'];",
    "const packages=(app.subPackages||[]).map(p=>p.root);",
    "if(packages.some(p=>!allowed.includes(p))) throw new Error('internal subpackage registered: '+packages.join(','));",
    "if(project.setting.uploadWithSourceMap) throw new Error('source maps must be disabled for submission');",
    "if(Object.prototype.hasOwnProperty.call(app,'requiredPrivateInfos')) throw new Error('unused private API declaration present');",
    "console.log('submission packages',packages.join(','));"
  ].join(' '));
  runNodeEval('AI_STREAM_DEVICE_PROOF_HEADER', [
    "const fs=require('fs');",
    "const source=fs.readFileSync('services/agent/chat.js','utf8');",
    "if(!source.includes(\"'X-Device-Session'\")) throw new Error('AI stream missing device session header');",
    "if(!source.includes(\"'X-Device-Live'\")) throw new Error('AI stream missing live proof header');",
    "if(!source.includes('JSON.parse(decodeChunk(body))')) throw new Error('AI stream does not decode ArrayBuffer errors');"
  ].join(' '));
  runNodeEval('MEDICAL_ACCESS_GUARD', [
    "const fs=require('fs');",
    "const api=fs.readFileSync('backend/src/modules/agent-api.js','utf8');",
    "const policy=require('./backend/src/security/medical-content-policy');",
    "if(api.includes('body.mode ?')) throw new Error('client-controlled AI mode is not allowed');",
    "if(!policy.containsMedicalContent('请整理这份病历') || !policy.containsMedicalContent('patient treatment notes')) throw new Error('medical policy missed known medical content');",
    "if(policy.containsMedicalContent('请整理一份会议纪要')) throw new Error('medical policy blocked general content');"
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
    STORE_MODE: 'file',
    ADMIN_PASSWORD: 'release-check-admin-password',
    ORDER_ENTITLEMENT_HASH_SECRET: 'release-check-order-secret-32-characters',
    WECHAT_APP_ID: 'release-check-app-id',
    WECHAT_APP_SECRET: 'release-check-app-secret',
    AI_API_KEY: 'release-check-ai-key'
  });
  runNodeEval('PROD_CONFIG_GUARD', [
    "try {",
    "require('./backend/src/config');",
    "console.error('incomplete production configuration unexpectedly allowed');",
    "process.exit(1);",
    "} catch (error) {",
    "if (!String(error.message).includes('Invalid production configuration')) throw error;",
    "}"
  ].join(' '), {
    NODE_ENV: 'production',
    STORE_MODE: 'mysql',
    ADMIN_PASSWORD: '',
    ORDER_ENTITLEMENT_HASH_SECRET: '',
    WECHAT_APP_ID: '',
    WECHAT_APP_SECRET: '',
    AI_API_KEY: '',
    DASHSCOPE_API_KEY: ''
  });
  runNodeEval('ADMIN_ASSET', [
    "const {server}=require('./backend/src/server');",
    "const port=18183;",
    "const base='http://127.0.0.1:'+port;",
    "async function main(){",
    "const html=await fetch(base+'/admin').then(r=>r.text());",
    "const js=await fetch(base+'/admin/app.js').then(r=>r.text());",
    "const claim=await fetch(base+'/claim').then(r=>r.text());",
    "if(!html.includes('文本传输助手管理后台')) throw new Error('admin html missing title');",
    "if(!js.includes('/api/admin/devices/import')) throw new Error('admin js missing device import');",
    "if(!claim.includes('领取已购会员')) throw new Error('claim html missing title');",
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
