const PORT = Number(process.env.TRIAL_SMOKE_PORT || 18081);
process.env.STORE_MODE = 'memory';
process.env.PORT = String(PORT);

const { server } = require('../src/server');
const { config } = require('../src/config');

// Trial-flow smoke must not actually hit WeChat jscode2session.
config.wechatAppId = '';
config.wechatAppSecret = '';
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

async function requestRaw(path, options) {
  const response = await fetch(BASE_URL + path, Object.assign({
    headers: { 'Content-Type': 'application/json' }
  }, options || {}));
  return {
    status: response.status,
    body: await response.json()
  };
}

async function run() {
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));

  const adminLogin = await request('/api/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ account: 'admin', password: 'ChangeMe123!' })
  });
  assert(adminLogin.token, 'admin token missing');
  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + adminLogin.token
  };

  const importResult = await request('/api/admin/activation-codes/import', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ codesText: 'TRIAL-ACTIVE-001', memberDays: 30 })
  });
  assert(importResult.importedCount === 1, 'activation import failed');

  const userLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone: '13900003001', code: '123456', wechatCode: 'trial-user' })
  });
  assert(userLogin.purchaseStatus === 'none', 'new trial user should start unpaid');
  const userHeaders = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + userLogin.token
  };

  const activation = await request('/api/purchase/activate', {
    method: 'POST',
    headers: userHeaders,
    body: JSON.stringify({ activationCode: 'TRIAL-ACTIVE-001' })
  });
  assert(activation.purchaseStatus === 'paid', 'activation should mark purchase paid');
  assert(activation.deviceBindingStatus === 'not_bound', 'activation should require binding');

  const reserveDevice = await request('/api/admin/devices', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      serialNo: 'PRO-TRIAL-RESERVED-001',
      reservedUserId: userLogin.user.id,
      proofCode: '2468'
    })
  });
  assert(reserveDevice.serialNo === 'PRO-TRIAL-RESERVED-001', 'reserved device missing');

  const importDevices = await request('/api/admin/devices/import', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      devicesText: [
        'serialNo,proofCode,model',
        'PRO-TRIAL-BATCH-001,1357,TXT-HID',
        'x,0000,TXT-HID'
      ].join('\n')
    })
  });
  assert(importDevices.importedCount === 1, 'device batch import should import one valid row');
  assert(importDevices.errorCount === 1, 'device batch import should report one invalid row');
  assert(importDevices.imported[0].hasProofCode === true, 'device batch import should store proof hash');

  const wrongProof = await requestRaw('/api/devices/bind', {
    method: 'POST',
    headers: userHeaders,
    body: JSON.stringify({ serialNo: 'PRO-TRIAL-RESERVED-001', proofCode: '0000' })
  });
  assert(wrongProof.status === 403, 'wrong proofCode should be rejected');
  assert(wrongProof.body.code === 'DEVICE_PROOF_INVALID', 'wrong proofCode error mismatch');

  const device = await request('/api/devices/bind', {
    method: 'POST',
    headers: userHeaders,
    body: JSON.stringify({ serialNo: 'PRO-TRIAL-RESERVED-001', proofCode: '2468' })
  });
  assert(device.bindStatus === 'bound', 'device should be bound');
  assert(device.proofCodeHash === undefined, 'device proof hash should not be exposed');

  const me = await request('/api/auth/me', { headers: userHeaders });
  assert(me.purchaseStatus === 'paid', 'me should remain paid');
  assert(me.deviceBindingStatus === 'bound', 'me should show bound device');
  assert(me.serviceStatus === 'active', 'me should show active service');

  const codeList = await request('/api/admin/activation-codes', { headers: adminHeaders });
  assert(codeList.list.some((item) => item.status === 'used'), 'activation code should be used');

  const deviceList = await request('/api/admin/devices?keyword=PRO-TRIAL-BATCH-001', { headers: adminHeaders });
  assert(deviceList.list.length === 1, 'imported device should be searchable');
  assert(deviceList.list[0].proofCodeHash === undefined, 'admin device list should not expose proof hash');

  const templateCsv = await fetch(BASE_URL + '/api/admin/exports/device-import-template.csv', {
    headers: { Authorization: 'Bearer ' + adminLogin.token }
  });
  const templateText = await templateCsv.text();
  assert(templateCsv.ok, 'device import template should download');
  assert(templateText.indexOf('serialNo,proofCode') !== -1, 'device import template header missing');

  console.log('TRIAL_FLOW_SMOKE_OK');
}

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => {
    server.close();
  });
