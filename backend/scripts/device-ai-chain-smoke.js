const PORT = Number(process.env.SMOKE_PORT || 18081);
process.env.STORE_MODE = 'memory';
process.env.PORT = String(PORT);
process.env.WECHAT_APP_ID = '';
process.env.WECHAT_APP_SECRET = '';

const { server } = require('../src/server');
const { config } = require('../src/config');

config.wechatAppId = '';
config.wechatAppSecret = '';

const BASE_URL = process.env.SMOKE_BASE_URL || ('http://127.0.0.1:' + PORT);
const STAMP = Date.now();
const ACTIVATION_CODE = 'SMOKE-AI-' + STAMP;
const USER_CODE = 'smoke-ai-user-' + STAMP;
const SERIAL_NO = 'SMOKE-AI-DEVICE-' + STAMP;
const PROOF_CODE = '246810';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function headers(extra) {
  return Object.assign({ 'Content-Type': 'application/json' }, extra || {});
}

async function request(path, options) {
  const response = await fetch(BASE_URL + path, Object.assign({
    headers: headers()
  }, options || {}));
  let body = null;
  try {
    body = await response.json();
  } catch (error) {
    throw new Error(path + ' returned non-json response: HTTP ' + response.status);
  }
  if (!response.ok || body.code !== 'OK') {
    throw new Error(path + ' failed: HTTP ' + response.status + ' ' + (body.code || '') + ' ' + (body.message || ''));
  }
  return body.data;
}

function authed(token, extra) {
  return headers(Object.assign({ Authorization: 'Bearer ' + token }, extra || {}));
}

async function run() {
  if (!process.env.SMOKE_BASE_URL) {
    await new Promise((resolve) => server.listen(PORT, resolve));
  }

  console.log('[1/9] health');
  const health = await request('/api/health');
  assert(health.service === 'yisheng-backend', 'backend service mismatch');
  console.log('      provider=' + health.aiProvider + ', aiConfigured=' + health.aiConfigured);

  console.log('[2/9] admin login');
  const admin = await request('/api/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ account: 'admin', password: 'ChangeMe123!' })
  });
  assert(admin.token, 'admin token missing');

  console.log('[3/9] create activation code');
  await request('/api/admin/activation-codes/import', {
    method: 'POST',
    headers: authed(admin.token),
    body: JSON.stringify({ codesText: ACTIVATION_CODE, memberDays: 30 })
  });

  console.log('[4/9] user login + activate');
  const user = await request('/api/auth/wechat-login', {
    method: 'POST',
    body: JSON.stringify({ code: USER_CODE })
  });
  assert(user.token, 'user token missing');
  await request('/api/purchase/activate', {
    method: 'POST',
    headers: authed(user.token),
    body: JSON.stringify({ activationCode: ACTIVATION_CODE })
  });

  console.log('[5/9] bind device');
  const device = await request('/api/devices/bind', {
    method: 'POST',
    headers: authed(user.token),
    body: JSON.stringify({ serialNo: SERIAL_NO, proofCode: PROOF_CODE })
  });
  assert(device.id && device.bindStatus === 'bound', 'device bind failed');

  console.log('[6/9] open device session');
  const challenge = await request('/api/devices/session/start', {
    method: 'POST',
    headers: authed(user.token),
    body: JSON.stringify({ deviceId: device.id, serialNo: SERIAL_NO })
  });
  assert(challenge.challengeId && challenge.nonce, 'challenge missing');

  const session = await request('/api/devices/session/verify', {
    method: 'POST',
    headers: authed(user.token),
    body: JSON.stringify({
      challengeId: challenge.challengeId,
      deviceId: device.id,
      response: PROOF_CODE
    })
  });
  assert(session.deviceSessionToken, 'device session token missing');
  assert(Array.isArray(session.capabilities) && session.capabilities.indexOf('professional_ai') !== -1, 'professional_ai capability missing');

  console.log('[7/9] quick-actions with device session');
  const quickActions = await request('/api/ai/quick-actions', {
    headers: authed(user.token, { 'X-Device-Session': session.deviceSessionToken })
  });
  assert(Array.isArray(quickActions.quickActions), 'quickActions missing');
  assert(quickActions.quickActions.length > 0, 'no quick actions returned for professional session');
  quickActions.quickActions.forEach((item) => {
    assert(!Object.prototype.hasOwnProperty.call(item, 'promptContent'), 'promptContent leaked to client');
    assert(!Object.prototype.hasOwnProperty.call(item, 'qualityRules'), 'qualityRules leaked to client');
    assert(!Object.prototype.hasOwnProperty.call(item, 'missingInfoRules'), 'missingInfoRules leaked to client');
    assert(!Object.prototype.hasOwnProperty.call(item, 'forbiddenRules'), 'forbiddenRules leaked to client');
    assert(!Object.prototype.hasOwnProperty.call(item, 'audience'), 'audience leaked to client');
  });
  const action = quickActions.quickActions[0];
  console.log('      action=' + action.title + ' (' + action.id + ')');

  console.log('[8/9] AI generate through selected quick-action');
  const ai = await request('/api/ai/assistant', {
    method: 'POST',
    headers: authed(user.token, { 'X-Device-Session': session.deviceSessionToken }),
    body: JSON.stringify({
      actionId: action.id,
      redactedText: '主诉头痛两天，体温 37.8 摄氏度，已口服退热药一次，要求整理成可直接使用的记录。',
      messages: []
    })
  });
  assert(ai.resultText && ai.resultText.indexOf('【正文】') !== -1, 'AI result missing body section');
  assert(ai.resultText.indexOf('【待确认】') !== -1, 'AI result missing confirm section');
  assert(ai.bodyText, 'AI bodyText missing');
  console.log('      bodyLength=' + ai.bodyText.length + ', confirmLength=' + String(ai.confirmText || '').length);

  console.log('[9/9] session refresh');
  const refreshed = await request('/api/devices/session/refresh', {
    method: 'POST',
    headers: authed(user.token, { 'X-Device-Session': session.deviceSessionToken }),
    body: JSON.stringify({})
  });
  assert(refreshed.deviceSessionToken && refreshed.deviceSessionToken !== session.deviceSessionToken, 'session refresh failed');

  console.log('DEVICE_AI_CHAIN_SMOKE_OK');
}

run().catch((error) => {
  console.error('DEVICE_AI_CHAIN_SMOKE_FAILED');
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => {
  if (!process.env.SMOKE_BASE_URL) server.close();
});
