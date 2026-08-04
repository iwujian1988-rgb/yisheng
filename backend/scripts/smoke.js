const PORT = Number(process.env.SMOKE_PORT || 18080);
process.env.STORE_MODE = 'memory';
process.env.PORT = String(PORT);

const { server } = require('../src/server');
const { config } = require('../src/config');

config.wechatAppId = '';
config.wechatAppSecret = '';
config.ocrWorkerUrl = '';
config.asrWorkerUrl = '';
config.dashscopeApiKey = '';
config.asrCloudApiKey = '';
config.ocrCloudEnabled = false;
config.agentServiceEnabled = false;

const BASE_URL = 'http://127.0.0.1:' + PORT;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(path, options) {
  const response = await fetch(BASE_URL + path, Object.assign({
    headers: { 'Content-Type': 'application/json' }
  }, options || {}));
  const body = await response.json();
  if (!response.ok || body.code !== 'OK') {
    throw new Error(path + ' failed: ' + (body.message || body.code));
  }
  return body.data;
}

async function requestExpectError(path, options, expectedCode) {
  const response = await fetch(BASE_URL + path, Object.assign({
    headers: { 'Content-Type': 'application/json' }
  }, options || {}));
  const body = await response.json();
  if (response.ok || body.code !== expectedCode) {
    throw new Error(path + ' expected ' + expectedCode + ', got ' + (body.code || response.status));
  }
  return body;
}

async function run() {
  await new Promise((resolve) => server.listen(PORT, resolve));

  const health = await request('/api/health');
  assert(health.service, 'health missing service');
  assert(health.storeMode === 'memory', 'health should expose store mode');
  assert(Object.prototype.hasOwnProperty.call(health, 'ocrConfigured'), 'health missing OCR config state');
  assert(Object.prototype.hasOwnProperty.call(health, 'asrConfigured'), 'health missing ASR config state');
  assert(Object.prototype.hasOwnProperty.call(health, 'aiConfigured'), 'health missing AI config state');
  assert(Object.prototype.hasOwnProperty.call(health, 'agentChatAvailable'), 'health missing agent chat availability');

  const adminLogin = await request('/api/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ account: 'admin', password: 'ChangeMe123!' })
  });
  assert(adminLogin.token, 'admin token missing');

  const templates = await request('/api/admin/templates', {
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + adminLogin.token
    }
  });
  assert(Array.isArray(templates.list), 'admin template list missing');

  await requestExpectError('/api/auth/wechat-login', {
    method: 'POST',
    body: JSON.stringify({ code: 'smoke-unbound-wechat' })
  }, 'WECHAT_NOT_BOUND');

  const userLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone: '13900001001', code: '123456', wechatCode: 'smoke-test' })
  });
  assert(userLogin.token, 'user token missing');
  assert(userLogin.user && userLogin.user.id, 'phone login should create stable user id');

  const boundWechatLogin = await request('/api/auth/wechat-login', {
    method: 'POST',
    body: JSON.stringify({ code: 'smoke-test' })
  });
  assert(boundWechatLogin.user.id === userLogin.user.id, 'wechat login should reuse bound phone user id');

  const userTemplates = await request('/api/templates', {
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + userLogin.token
    }
  });
  assert(Array.isArray(userTemplates.templates), 'user template list missing');

  await request('/api/admin/activation-codes/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + adminLogin.token
    },
    body: JSON.stringify({
      codesText: 'SMOKE-ACTIVE-001',
      memberDays: 365
    })
  });

  const activatedUser = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone: '13900001002', code: '123456', wechatCode: 'smoke-activation-user' })
  });
  await request('/api/purchase/activate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + activatedUser.token
    },
    body: JSON.stringify({ activationCode: 'SMOKE-ACTIVE-001' })
  });

  await request('/api/devices/bind', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + activatedUser.token
    },
    body: JSON.stringify({ serialNo: 'PRO-SMOKE-001', proofCode: '0000' })
  });

  const session = await request('/api/auth/me', {
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + activatedUser.token
    }
  });
  const deviceSessionChallenge = await request('/api/devices/session/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + activatedUser.token
    },
    body: JSON.stringify({ deviceId: session.device && session.device.id })
  });
  const deviceSession = await request('/api/devices/session/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + activatedUser.token
    },
    body: JSON.stringify({
      challengeId: deviceSessionChallenge.challengeId,
      deviceId: session.device && session.device.id,
      response: '0000'
    })
  });

  const heartbeat = await request('/api/devices/heartbeat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + activatedUser.token,
      'X-Device-Session': deviceSession.deviceSessionToken
    }
  });

  const createdTemplate = await request('/api/admin/templates', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + adminLogin.token
    },
    body: JSON.stringify({
      templateCode: 'pro_smoke_summary',
      name: '专业内容整理',
      description: '按结构整理输入内容',
      category: 'professional',
      audience: 'professional',
      variableDefs: [
        { key: 'topic', label: '主题', type: 'input', required: true },
        { key: 'detail', label: '关键内容', type: 'textarea', required: true }
      ],
      promptContent: ''
    })
  });

  await request('/api/admin/templates/' + createdTemplate.id, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + adminLogin.token
    },
    body: JSON.stringify({ status: 'published' })
  });

  const professionalTemplates = await request('/api/templates', {
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + activatedUser.token,
      'X-Device-Session': deviceSession.deviceSessionToken,
      'X-Device-Live': heartbeat.liveProof
    }
  });
  assert(professionalTemplates.templates.some((item) => item.id === 'tpl_official_first_course'), 'official first course missing');
  const officialCount = professionalTemplates.templates.filter((item) => item.tag === 'official').length;
  assert(officialCount >= 5, 'expected at least 5 official templates, got ' + officialCount);

  const textTasks = await request('/api/agent/text/tasks', {
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + activatedUser.token
    }
  });
  assert(Array.isArray(textTasks.tasks) && textTasks.tasks.length >= 5, 'agent text tasks missing');

  const ocrResult = await request('/api/ocr/recognize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + activatedUser.token,
      'X-Device-Session': deviceSession.deviceSessionToken
    },
    body: JSON.stringify({ imageBase64: 'data:image/png;base64,AA==' })
  });
  assert(ocrResult.status === 'not_configured', 'OCR should be in not_configured state without worker');

  const asrResult = await request('/api/asr/transcribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + activatedUser.token,
      'X-Device-Session': deviceSession.deviceSessionToken
    },
    body: JSON.stringify({ audioBase64: 'data:audio/mp3;base64,AA==', format: 'mp3' })
  });
  assert(asrResult.status === 'not_configured', 'ASR should be in not_configured state without worker');

  const feedback = await request('/api/support/feedbacks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + activatedUser.token
    },
    body: JSON.stringify({
      type: '使用问题',
      content: '操作过程中遇到问题',
      contact: ''
    })
  });
  assert(feedback.status === 'pending' && feedback.contentLength > 0, 'feedback submission failed');

  const issue = await request('/api/support/issues', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + activatedUser.token
    },
    body: JSON.stringify({
      type: '无法连接',
      description: '设备连接失败',
      serialNo: 'PRO-SMOKE-001'
    })
  });
  assert(issue.status === 'pending' && issue.descriptionLength > 0, 'issue submission failed');

  console.log('SMOKE_OK');
}

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => {
    server.close();
  });
