const http = require('http');
const fs = require('fs');
const path = require('path');
const { config } = require('./config');
const { createRouter } = require('./router');
const { fail, ok } = require('./http');
const { createSessionManager } = require('./security/tokens');
const { createStore } = require('./store/create-store');
const { createAuthModule } = require('./modules/auth');
const { createAdminModule } = require('./modules/admin');
const { createUserApiModule } = require('./modules/user-api');
const { createProviderGatewayModule } = require('./modules/provider-gateway');
const { createSmartCreationModule } = require('./modules/smart-creation');

const store = createStore();
const sessions = createSessionManager(config.sessionTtlSeconds);
const auth = createAuthModule({ store, sessions });
const admin = createAdminModule({ store, auth });
const userApi = createUserApiModule({ store, auth });
const providers = createProviderGatewayModule({ auth, store });
const smartCreation = createSmartCreationModule({ store, auth });
const router = createRouter();

function serveAdminAsset(req, res) {
  var url = new URL(req.url, 'http://localhost');
  if (url.pathname !== '/admin' && url.pathname.indexOf('/admin/') !== 0) return false;
  var relativePath = url.pathname === '/admin' || url.pathname === '/admin/'
    ? 'index.html'
    : url.pathname.replace('/admin/', '');
  if (relativePath.indexOf('..') !== -1) {
    fail(res, 400, 'INVALID_PATH', 'invalid path');
    return true;
  }
  var filePath = path.join(__dirname, '..', 'public', 'admin', relativePath);
  if (!fs.existsSync(filePath)) {
    fail(res, 404, 'NOT_FOUND', 'asset not found');
    return true;
  }
  var ext = path.extname(filePath);
  var type = ext === '.js' ? 'application/javascript; charset=utf-8'
    : ext === '.css' ? 'text/css; charset=utf-8'
      : 'text/html; charset=utf-8';
  res.writeHead(200, { 'Content-Type': type });
  res.end(fs.readFileSync(filePath));
  return true;
}

router.get('/api/health', (req, res) => {
  var dashscopeReady = Boolean(config.dashscopeApiKey);
  var ocrCloudReady = Boolean(config.ocrCloudEnabled && dashscopeReady);
  ok(res, {
    service: 'yisheng-backend',
    env: config.env,
    storeMode: config.storeMode,
    allowUnknownDeviceBinding: config.allowUnknownDeviceBinding,
    ocrEngine: ocrCloudReady ? config.ocrCloudModel : config.ocrEngine,
    ocrConfigured: ocrCloudReady || Boolean(config.ocrWorkerUrl),
    asrEngine: config.asrEngine,
    asrConfigured: dashscopeReady || Boolean(config.asrWorkerUrl),
    aiProvider: config.aiProvider,
    aiConfigured: Boolean(config.aiApiKey && (config.aiChatCompletionsUrl || config.aiBaseUrl)),
    wechatConfigured: Boolean(config.wechatAppId && config.wechatAppSecret)
  });
});

router.post('/api/admin/auth/login', auth.adminLogin);
router.post('/api/auth/login', auth.login);
router.post('/api/auth/register-code', auth.requestRegisterCode);
router.post('/api/auth/register', auth.phoneCodeLogin);
router.post('/api/auth/wechat-login', auth.wechatLogin);
router.get('/api/auth/me', auth.me);

router.get('/api/admin/paid-users', admin.listPaidUsers);
router.post('/api/admin/paid-users', admin.createPaidUser);
router.get('/api/admin/dashboard', admin.dashboard);
router.get('/api/admin/exports/users.csv', admin.exportUsers);
router.get('/api/admin/exports/audit-logs.csv', admin.exportAuditLogs);
router.get('/api/admin/exports/device-import-template.csv', admin.exportDeviceImportTemplate);
router.get('/api/admin/paid-users/:id', admin.paidUserDetail);
router.patch('/api/admin/paid-users/:id', admin.updatePaidUser);
router.get('/api/admin/devices', admin.listDevices);
router.post('/api/admin/devices', admin.createDevice);
router.post('/api/admin/devices/import', admin.importDevices);
router.post('/api/admin/devices/:id/unbind', admin.forceUnbindDevice);
router.get('/api/admin/orders', admin.listOrders);
router.get('/api/admin/orders/:id', admin.orderDetail);
router.post('/api/admin/orders/:id/cancel', admin.cancelOrder);
router.post('/api/admin/orders/:id/refund', admin.refundOrder);
router.get('/api/admin/service-records', admin.listServiceRecords);
router.get('/api/admin/token-usage', admin.listTokenUsage);
router.get('/api/admin/templates', admin.listTemplates);
router.post('/api/admin/templates', admin.createTemplate);
router.get('/api/admin/templates/:id', admin.templateDetail);
router.patch('/api/admin/templates/:id', admin.updateTemplate);
router.get('/api/admin/quick-actions', admin.listQuickActions);
router.post('/api/admin/quick-actions', admin.createQuickAction);
router.patch('/api/admin/quick-actions/:id', admin.updateQuickAction);
router.get('/api/admin/feedbacks', admin.listFeedbacks);
router.patch('/api/admin/feedbacks/:id', admin.updateFeedback);
router.get('/api/admin/activation-codes', admin.listActivationCodes);
router.post('/api/admin/activation-codes/import', admin.importActivationCodes);
router.get('/api/admin/audit-logs', admin.listAuditLogs);
router.get('/api/admin/admin-users', admin.listAdminUsers);
router.post('/api/admin/admin-users', admin.createAdminUser);
router.patch('/api/admin/admin-users/:id', admin.updateAdminUser);

router.get('/api/devices/me', userApi.mineDevice);
router.post('/api/devices/bind', userApi.bindDevice);
router.post('/api/devices/auto-bind', userApi.autoBindDevice);
router.post('/api/devices/session/start', userApi.startDeviceSession);
router.post('/api/devices/session/verify', userApi.verifyDeviceSession);
router.post('/api/devices/session/refresh', userApi.refreshDeviceSession);
router.post('/api/devices/unbind', userApi.unbindDevice);
router.get('/api/devices/firmware', userApi.firmware);
router.get('/api/purchase/entitlement', userApi.purchaseEntitlement);
router.post('/api/purchase/activate', userApi.activatePurchase);
router.get('/api/purchase/records', userApi.purchaseRecords);
router.get('/api/ai/templates', userApi.listTemplates);
router.get('/api/ai/quick-actions', userApi.listQuickActions);
router.get('/api/ai/templates/:id', userApi.templateDetail);
router.post('/api/ai/templates/:id/generate', userApi.generateTemplate);
router.post('/api/support/feedbacks', userApi.submitFeedback);
router.post('/api/support/issues', userApi.submitIssue);
router.get('/api/qa/long-text-tests', userApi.listLongTextTests);
router.post('/api/qa/long-text-tests', userApi.saveLongTextTest);
router.post('/api/qa/bug-reports', userApi.submitBugReport);

router.post('/api/ai/assistant', providers.aiAssistant);

router.get('/api/ai/modes', smartCreation.listModes);
router.post('/api/ai/user-templates', smartCreation.createUserTemplate);
router.get('/api/ai/user-templates', smartCreation.listUserTemplates);
router.delete('/api/ai/user-templates/:id', smartCreation.deleteUserTemplate);
router.post('/api/ocr/recognize', providers.ocrRecognize);
router.post('/api/asr/transcribe', providers.asrTranscribe);

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && serveAdminAsset(req, res)) {
      return;
    }
    await router.handle(req, res, { store });
    if (req.method !== 'GET' && typeof store.save === 'function') {
      store.save();
    }
  } catch (error) {
    if (error.message === 'INVALID_JSON') {
      fail(res, 400, 'INVALID_JSON', 'request body is not valid JSON');
      return;
    }
    if (error.message === 'REQUEST_BODY_TOO_LARGE') {
      fail(res, 413, 'REQUEST_BODY_TOO_LARGE', 'request body is too large');
      return;
    }
    fail(res, 500, 'INTERNAL_ERROR', error.message);
  }
});

if (require.main === module) {
  server.listen(config.port, '0.0.0.0', () => {
    console.log('Yisheng backend listening on 0.0.0.0:' + config.port);
    console.log('Local:   http://127.0.0.1:' + config.port);
    console.log('Network: http://<your-lan-ip>:' + config.port + '  (set app.js lanBaseHost)');
  });
}

module.exports = {
  server,
  store
};
