const http = require('http');
const fs = require('fs');
const path = require('path');
const { config } = require('./config');
const { createRouter } = require('./router');
const { fail, ok } = require('./http');
const { createSessionManager } = require('./security/tokens');
const { createStore } = require('./store/create-store');
const { logger, requestLogger } = require('./middleware/logger');
const health = require('./middleware/health');
const { createAuthModule } = require('./modules/auth');
const { createAdminModule } = require('./modules/admin');
const { createUserApiModule } = require('./modules/user-api');
const { createProviderGatewayModule } = require('./modules/provider-gateway');
const { createTemplatesModule } = require('./modules/templates');
const { createAgentApiModule } = require('./modules/agent-api');
const { createAiWorkspacesModule } = require('./modules/ai-workspaces');
const { createAiWorkspaceRepository } = require('./repositories/ai-workspace-repository');
const { createOrderEntitlementsModule } = require('./modules/order-entitlements');
const contentAccess = require('./security/content-access');

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
      : ext === '.png' ? 'image/png'
        : 'text/html; charset=utf-8';
  res.writeHead(200, { 'Content-Type': type });
  res.end(fs.readFileSync(filePath));
  return true;
}

function serveClaimAsset(req, res) {
  var url = new URL(req.url, 'http://localhost');
  if (url.pathname !== '/claim' && url.pathname.indexOf('/claim/') !== 0) return false;
  var relativePath = url.pathname === '/claim' || url.pathname === '/claim/'
    ? 'index.html'
    : url.pathname.replace('/claim/', '');
  if (relativePath.indexOf('..') !== -1) {
    fail(res, 400, 'INVALID_PATH', 'invalid path');
    return true;
  }
  var filePath = path.join(__dirname, '..', 'public', 'claim', relativePath);
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

function serveGuideAsset(req, res) {
  var url = new URL(req.url, 'http://localhost');
  if (url.pathname !== '/guide' && url.pathname.indexOf('/guide/') !== 0) return false;
  var relativePath = url.pathname === '/guide' || url.pathname === '/guide/'
    ? 'index.html'
    : url.pathname.replace('/guide/', '');
  if (relativePath.indexOf('..') !== -1) {
    fail(res, 400, 'INVALID_PATH', 'invalid path');
    return true;
  }
  var filePath = path.join(__dirname, '..', 'public', 'guide', relativePath);
  if (!fs.existsSync(filePath)) {
    fail(res, 404, 'NOT_FOUND', 'asset not found');
    return true;
  }
  var ext = path.extname(filePath);
  var type = ext === '.js' ? 'application/javascript; charset=utf-8'
    : ext === '.css' ? 'text/css; charset=utf-8'
      : ext === '.png' ? 'image/png'
        : 'text/html; charset=utf-8';
  var cacheControl = ext === '.html' ? 'no-cache' : 'public, max-age=3600';
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': cacheControl });
  res.end(fs.readFileSync(filePath));
  return true;
}

const store = createStore();
const storeReady = Promise.resolve(store.ready || null);
health.register(store);
storeReady.then(function () { store.__mysqlReady = true; }, function () { store.__mysqlReady = false; });
const sessions = createSessionManager(config.sessionTtlSeconds, store);
const auth = createAuthModule({ store, sessions });
const admin = createAdminModule({ store, auth });
const userApi = createUserApiModule({ store, auth });
const providers = createProviderGatewayModule({ auth, store });
const templatesModule = createTemplatesModule({ store, auth, contentAccess });
const aiWorkspaceRepository = createAiWorkspaceRepository(store);
const agentApi = createAgentApiModule({ store, auth, templates: templatesModule, workspaceRepository: aiWorkspaceRepository });
const aiWorkspaces = createAiWorkspacesModule({
  store,
  auth,
  templates: templatesModule,
  contentAccess,
  repository: aiWorkspaceRepository
});
const orderEntitlements = createOrderEntitlementsModule({ store, auth });
const router = createRouter();

router.get('/api/health', (req, res) => {
  var dashscopeReady = Boolean(config.dashscopeApiKey);
  var ocrCloudReady = Boolean(config.ocrCloudEnabled && dashscopeReady);
  ok(res, {
    service: 'xiaoke-api',
    status: 'ok',
    env: config.env,
    storeMode: config.storeMode,
    allowUnknownDeviceBinding: config.allowUnknownDeviceBinding,
    ocrEngine: ocrCloudReady ? config.ocrCloudModel : config.ocrEngine,
    ocrConfigured: ocrCloudReady || Boolean(config.ocrWorkerUrl),
    asrEngine: config.asrEngine,
    asrConfigured: dashscopeReady || Boolean(config.asrWorkerUrl),
    aiProvider: config.aiProvider,
    aiConfigured: Boolean(config.aiApiKey && (config.aiChatCompletionsUrl || config.aiBaseUrl)),
    agentChatAvailable: config.agentServiceEnabled || Boolean(config.aiApiKey && (config.aiChatCompletionsUrl || config.aiBaseUrl)),
    agentServiceEnabled: config.agentServiceEnabled,
    agentServiceUrl: config.agentServiceUrl,
    wechatConfigured: Boolean(config.wechatAppId && config.wechatAppSecret)
  });
});

router.get('/healthz', health.liveness);
router.get('/readyz', health.readiness);

router.post('/api/admin/auth/login', auth.adminLogin);
router.post('/api/auth/login', auth.login);
router.post('/api/auth/register-code', auth.requestRegisterCode);
router.post('/api/auth/register', auth.phoneCodeLogin);
router.post('/api/auth/wechat-login', auth.wechatLogin);
router.get('/api/auth/me', auth.me);
router.post('/api/auth/cancel-account', auth.cancelAccount);

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
router.get('/api/admin/agent-templates', admin.listAgentTemplates);
router.get('/api/admin/agent-templates/:id', admin.agentTemplateDetail);
router.patch('/api/admin/agent-templates/:id', admin.updateAgentTemplate);
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
router.post('/api/admin/order-entitlements/import', orderEntitlements.importOrders);
router.post('/api/admin/order-entitlements/preset', orderEntitlements.presetEntitlement);
router.get('/api/admin/order-entitlements', orderEntitlements.listEntitlements);
router.patch('/api/admin/order-entitlements/:id/recipient-phone', orderEntitlements.reassignRecipient);
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
router.post('/api/devices/heartbeat', userApi.heartbeatDevice);
router.post('/api/devices/unbind', userApi.unbindDevice);
router.get('/api/devices/firmware', userApi.firmware);
router.get('/api/purchase/entitlement', userApi.purchaseEntitlement);
router.post('/api/purchase/activate', userApi.activatePurchase);
router.post('/api/purchase/claim-order-entitlement', orderEntitlements.claim);
router.post('/api/public/order-entitlements/requests', orderEntitlements.createClaimRequest);
router.get('/api/purchase/records', userApi.purchaseRecords);

router.post('/api/support/feedbacks', userApi.submitFeedback);
router.post('/api/support/issues', userApi.submitIssue);
router.get('/api/qa/long-text-tests', userApi.listLongTextTests);
router.post('/api/qa/long-text-tests', userApi.saveLongTextTest);
router.post('/api/qa/bug-reports', userApi.submitBugReport);

router.get('/api/agent/text/tasks', templatesModule.listTextTasks);
router.post('/api/agent/text', agentApi.agentText);
router.post('/api/agent/template', agentApi.agentTemplate);
router.post('/api/agent/ocr', agentApi.agentOcr);
router.post('/api/agent/asr', agentApi.agentAsr);
router.post('/api/agent/chat', agentApi.agentChat);
router.post('/api/agent/chat/stream', agentApi.agentChatStream);
router.post('/api/ai/workspaces', aiWorkspaces.createWorkspace);
router.get('/api/ai/workspaces/:id', aiWorkspaces.getWorkspace);
router.patch('/api/ai/workspaces/:id', aiWorkspaces.updateWorkspace);
router.post('/api/ai/workspaces/:id/fields', aiWorkspaces.saveField);
router.post('/api/ai/workspaces/:id/materials', aiWorkspaces.addMaterial);
router.patch('/api/ai/workspaces/:id/materials/:materialId', aiWorkspaces.updateMaterial);
router.post('/api/ai/workspaces/:id/generations', aiWorkspaces.createGeneration);
router.post('/api/ai/workspaces/:id/interpret', aiWorkspaces.interpretInput);
router.get('/api/templates', templatesModule.listTemplates);
router.get('/api/templates/:id', templatesModule.getTemplate);
router.post('/api/templates', templatesModule.saveTemplate);

router.post('/api/ocr/recognize', providers.ocrRecognize);
router.post('/api/asr/transcribe', providers.asrTranscribe);

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && (serveAdminAsset(req, res) || serveClaimAsset(req, res) || serveGuideAsset(req, res))) {
      return;
    }
    requestLogger(req, res);
    await router.handle(req, res, { store });
    if (req.method !== 'GET' && typeof store.save === 'function') {
      store.save();
    }
  } catch (error) {
    logger.error({ err: error }, 'unhandled request error');
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
  Promise.resolve(storeReady).then(function () {
    server.listen(config.port, '0.0.0.0', () => {
      console.log('Yisheng backend listening on 0.0.0.0:' + config.port);
      console.log('Local:   http://127.0.0.1:' + config.port);
      console.log('Network: http://<your-lan-ip>:' + config.port + '  (set app.js lanBaseHost)');
    });
  }).catch(function (err) {
    console.error('[server] bootstrap failed:', err && err.stack || err);
    process.exit(1);
  });
}

module.exports = {
  server,
  store,
  router,
  storeReady
};
