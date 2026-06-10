const PORT = Number(process.env.SMOKE_PORT || 18080);
process.env.STORE_MODE = 'memory';
process.env.PORT = String(PORT);

const { server } = require('../src/server');

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

async function run() {
  await new Promise((resolve) => server.listen(PORT, resolve));

  const health = await request('/api/health');
  assert(health.service, 'health missing service');
  assert(health.storeMode === 'memory', 'health should expose store mode');
  assert(Object.prototype.hasOwnProperty.call(health, 'ocrConfigured'), 'health missing OCR config state');
  assert(Object.prototype.hasOwnProperty.call(health, 'asrConfigured'), 'health missing ASR config state');
  assert(Object.prototype.hasOwnProperty.call(health, 'aiConfigured'), 'health missing AI config state');

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

  const userLogin = await request('/api/auth/wechat-login', {
    method: 'POST',
    body: JSON.stringify({ code: 'smoke-test' })
  });
  assert(userLogin.token, 'user token missing');

  const userTemplates = await request('/api/ai/templates', {
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

  const activatedUser = await request('/api/auth/wechat-login', {
    method: 'POST',
    body: JSON.stringify({ code: 'smoke-activation-user' })
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

  const professionalTemplates = await request('/api/ai/templates', {
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + activatedUser.token
    }
  });
  assert(professionalTemplates.templates.some((item) => item.templateCode === 'pro_smoke_summary'), 'professional template missing');

  const generated = await request('/api/ai/templates/' + createdTemplate.id + '/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + activatedUser.token
    },
    body: JSON.stringify({
      values: {
        topic: '工作记录',
        detail: '整理关键事项'
      }
    })
  });
  assert(generated.bodyText && generated.rawText.indexOf('【正文】') !== -1, 'template generation missing body');
  assert(generated.rawText.indexOf('【待确认】') !== -1, 'template generation missing confirmation section');

  const aiResult = await request('/api/ai/assistant', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + activatedUser.token
    },
    body: JSON.stringify({
      taskType: 'content_polish',
      redactedText: '请整理这段工作记录'
    })
  });
  assert(aiResult.resultText.indexOf('【正文】') !== -1, 'AI fallback missing body section');
  assert(aiResult.resultText.indexOf('【待确认】') !== -1, 'AI fallback missing confirmation section');

  const ocrResult = await request('/api/ocr/recognize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + activatedUser.token
    },
    body: JSON.stringify({ imageBase64: 'data:image/png;base64,AA==' })
  });
  assert(ocrResult.status === 'not_configured', 'OCR should be in not_configured state without worker');

  const asrResult = await request('/api/asr/transcribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + activatedUser.token
    },
    body: JSON.stringify({ audioBase64: 'data:audio/mp3;base64,AA==', format: 'mp3' })
  });
  assert(asrResult.status === 'not_configured', 'ASR should be in not_configured state without worker');

  const savedHistory = await request('/api/content/history', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + activatedUser.token
    },
    body: JSON.stringify({
      id: 'hist_smoke_001',
      ciphertext: 'protected-text',
      envelope: { version: 'smoke', meta: { source: 'manual' } },
      source: 'manual',
      status: 'success',
      success: true,
      textLength: 12,
      createdAt: '2026-06-05T00:00:00.000Z'
    })
  });
  assert(savedHistory.id === 'hist_smoke_001', 'history save should keep client id');

  const histories = await request('/api/content/history', {
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + activatedUser.token
    }
  });
  assert(histories.some((item) => item.id === 'hist_smoke_001'), 'history list missing saved item');

  const historyDetail = await request('/api/content/history/hist_smoke_001', {
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + activatedUser.token
    }
  });
  assert(historyDetail.ciphertext === 'protected-text', 'history detail missing protected payload');

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
