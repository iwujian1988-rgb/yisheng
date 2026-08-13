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
  run('NODE_CHECK_BLE_TRANSFER', process.execPath, ['--check', 'behaviors/ble-transfer.js']);
  run('NODE_CHECK_BLUETOOTH_PAGE', process.execPath, ['--check', 'pages/bluetooth/index.js']);
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
  runNodeEval('TDESIGN_ICON_LAYOUT', [
    "const fs=require('fs');",
    "const source=fs.readFileSync('miniprogram_npm/tdesign-miniprogram/icon/icon.wxss','utf8');",
    "if(!source.includes('.t-icon-base{font-style:normal') || !source.includes('text-align:center;display:block')) throw new Error('TDesign icon base layout no longer matches upstream');",
    "if(source.includes('.t-icon-base:before{') || source.includes('translateY(-.04em)')) throw new Error('TDesign icon glyph has an unsafe global vertical offset');",
    "if(source.includes('.t-icon-base{box-sizing:border-box;width:1em;height:1em')) throw new Error('TDesign icon base was changed into a fixed flex box');"
  ].join(' '));
  runNodeEval('PRIMARY_ICON_ASSETS', [
    "const fs=require('fs');",
    "const files=['home-purple','home-muted','edit-purple','edit-muted','view-module-purple','view-module-muted','user-purple','user-muted','time-purple','star-purple','folder-purple','bluetooth-purple','robot-purple','catalog-purple','image-purple','sound-purple'];",
    "for(const name of files){const path='assets/ui-icons/'+name+'.svg'; if(!fs.existsSync(path)) throw new Error('Missing primary icon asset: '+path); const source=fs.readFileSync(path,'utf8'); if(!source.includes('viewBox=\"0 0 24 24\"')) throw new Error('Invalid primary icon viewBox: '+path);}",
    "const home=fs.readFileSync('pages/home/home.wxml','utf8'); const tab=fs.readFileSync('custom-tab-bar/index.wxml','utf8');",
    "for(const name of ['time','star','folder','bluetooth','robot','catalog','image','sound']){if(!home.includes('/assets/ui-icons/'+name+'-purple.svg')) throw new Error('Homepage primary SVG icon missing: '+name);}",
    "if(tab.includes('<t-icon')) throw new Error('Tab bar regressed to font glyph icons');"
  ].join(' '));
  runNodeEval('AI_WORKSPACE_STARTUP_SEQUENCE', [
    "const fs=require('fs');",
    "const home=fs.readFileSync('pages/home/home.js','utf8'); const ai=fs.readFileSync('pages/ai/detail.js','utf8'); const client=fs.readFileSync('services/api/client.js','utf8'); const app=fs.readFileSync('app.js','utf8');",
    "if(!home.includes('this.resumePendingBleConnection()') || !home.includes('app.globalData.pendingBleConnect')) throw new Error('Home must adopt a user-initiated BLE connection handoff');",
    "if(home.includes('bleLink.shouldAutoReconnect()')) throw new Error('Home cold startup must not automatically request Bluetooth access');",
    "const bluetooth=fs.readFileSync('pages/bluetooth/index.js','utf8'); if(!bluetooth.includes('recoverConnectedDevice') || !bluetooth.includes('bleLink.markBleLinkReady(deviceId)')) throw new Error('Bluetooth page must recover and publish an existing verified link');",
    "if(!ai.includes('prepareProfessionalContext') || !ai.includes('liveHeartbeat.tick()') || !ai.includes('AI_WORKSPACE_DRAFT_KEY')) throw new Error('AI workspace must synchronize professional access and preserve drafts');",
    "if(ai.includes('templateCatalog.listTemplates()')) throw new Error('AI workspace must not issue a delayed fallback template request');",
    "if(!client.includes(\"responseCode !== 'AUTH_REQUIRED'\") || !client.includes('getToken() !== expectedToken')) throw new Error('401 handling must reject stale or non-auth responses');",
    "if(!app.includes('previousBleLinkReady') || !app.includes('bleLink.markBleLinkReady(previousBleDeviceId)')) throw new Error('Login must preserve an existing BLE link');"
  ].join(' '));
  runNodeEval('AI_TEMPLATE_DOCUMENT_WORKFLOW', [
    "const fs=require('fs');",
    "const js=fs.readFileSync('pages/ai/detail.js','utf8'); const wxml=fs.readFileSync('pages/ai/detail.wxml','utf8'); const wxss=fs.readFileSync('pages/ai/detail.wxss','utf8'); const direct=fs.readFileSync('backend/src/modules/direct-ai-chat.js','utf8'); const agent=fs.readFileSync('agent-service/app/agents/text.py','utf8');",
    "if(!js.includes('stripEmptyTemplateFields') || !js.includes('wx.onKeyboardHeightChange')) throw new Error('AI composer must filter empty template labels and track keyboard height');",
    "if(!wxml.includes('style=\"{{composerBottomStyle}}\"') || !wxml.includes('adjust-position=\"{{false}}\"')) throw new Error('AI composer keyboard positioning regressed');",
    "if(!wxss.includes('grid-template-columns: minmax(0, 1fr) auto') || !wxss.includes('z-index: 10020')) throw new Error('AI send button or confirmation sheet layout regressed');",
    "if(!direct.includes('Omit empty sections and field labels') || !agent.includes('正文只保留有事实内容的章节')) throw new Error('Template generation must produce a document instead of echoing empty fields');",
    "if(!direct.includes('Never infer or add a diagnosis') || !direct.includes('splitSectionedOutput') || !agent.includes('严禁新增诊断')) throw new Error('Medical generation fact boundaries regressed');"
  ].join(' '));
  runNodeEval('AI_DOCUMENT_WORKBENCH', [
    "const fs=require('fs');",
    "const js=fs.readFileSync('pages/ai/detail.js','utf8'); const wxml=fs.readFileSync('pages/ai/detail.wxml','utf8'); const wxss=fs.readFileSync('pages/ai/detail.wxss','utf8');",
    "if(!js.includes('buildMaterialSummary') || !js.includes('OCR 已加入') || !js.includes('录音转写已加入')) throw new Error('Document workbench must explain how sources join the selected template');",
    "for(const text of ['查看参考字段','输入、录音和 OCR 将合并整理','生成文书','templateConfirmSources','编辑正文','让 AI 修改']){if(!wxml.includes(text)) throw new Error('Document workbench missing: '+text);}",
    "if(!js.includes('buildTemplateConfirmPreview') || !js.includes('documentTaskStartIndex') || !js.includes(\"confirmEditorMode: 'direct'\")) throw new Error('Document isolation, material review, or direct editing regressed');",
    "if(!wxss.includes('.document-workbench') || !wxss.includes('.document-workbench__materials.is-ready') || !wxss.includes('.confirm-editor__textarea--document')) throw new Error('Document workbench states are missing');"
  ].join(' '));
  runNodeEval('PUBLIC_AI_COPY_GUARD', [
    "const fs=require('fs');",
    "const home=fs.readFileSync('pages/home/home.wxml','utf8'); const detail=fs.readFileSync('pages/ai/detail.wxml','utf8'); const js=fs.readFileSync('pages/ai/detail.js','utf8');",
    "for(const word of ['医疗诊断','在线问诊','治疗建议','医生服务']) if(home.includes(word)||detail.includes(word)) throw new Error('public AI copy exposes regulated positioning: '+word);",
    "if(!js.includes(\"item.audience === 'professional' && item.tag === 'official'\")) throw new Error('professional templates must remain hidden outside verified workspace');"
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
