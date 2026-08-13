const ENDPOINTS = {
  auth: {
    login: '/api/auth/login',
    wechatLogin: '/api/auth/wechat-login',
    registerCode: '/api/auth/register-code',
    register: '/api/auth/register',
    me: '/api/auth/me',
    cancelAccount: '/api/auth/cancel-account'
  },
  admin: {
    paidUsers: '/api/admin/paid-users',
    paidUserDetail: '/api/admin/paid-users/{id}',
    devices: '/api/admin/devices',
    deviceUnbind: '/api/admin/devices/{id}/unbind',
    serviceRecords: '/api/admin/service-records',
    feedbacks: '/api/admin/feedbacks',
    feedbackDetail: '/api/admin/feedbacks/{id}',
    activationCodes: '/api/admin/activation-codes',
    activationCodesImport: '/api/admin/activation-codes/import',
    auditLogs: '/api/admin/audit-logs',
    templates: '/api/admin/templates',
    templateDetail: '/api/admin/templates/{id}',
    quickActions: '/api/admin/quick-actions',
    quickActionDetail: '/api/admin/quick-actions/{id}',
    adminUsers: '/api/admin/admin-users',
    adminUserDetail: '/api/admin/admin-users/{id}',
    tokenUsage: '/api/admin/token-usage',
    dashboard: '/api/admin/dashboard'
  },
  devices: {
    mine: '/api/devices/me',
    bind: '/api/devices/bind',
    autoBind: '/api/devices/auto-bind',
    sessionStart: '/api/devices/session/start',
    sessionVerify: '/api/devices/session/verify',
    sessionRefresh: '/api/devices/session/refresh',
    heartbeat: '/api/devices/heartbeat',
    unbind: '/api/devices/unbind',
    firmware: '/api/devices/firmware'
  },
  purchase: {
    activate: '/api/purchase/activate',
    records: '/api/purchase/records',
    entitlement: '/api/purchase/entitlement',
    claimOrderEntitlement: '/api/purchase/claim-order-entitlement'
  },
  content: {
    drafts: '/api/content/drafts'
  },
  ocr: {
    recognize: '/api/ocr/recognize'
  },
  asr: {
    transcribe: '/api/asr/transcribe'
  },
  agent: {
    text: '/api/agent/text',
    textTasks: '/api/agent/text/tasks',
    template: '/api/agent/template',
    ocr: '/api/agent/ocr',
    asr: '/api/agent/asr',
    chat: '/api/agent/chat',
    chatStream: '/api/agent/chat/stream'
  },
  templates: {
    list: '/api/templates',
    detail: '/api/templates/{id}',
    save: '/api/templates'
  },
  support: {
    feedbacks: '/api/support/feedbacks',
    issues: '/api/support/issues',
    tickets: '/api/support/tickets'
  },
  qa: {
    smokeResults: '/api/qa/smoke-results',
    longTextTests: '/api/qa/long-text-tests',
    bugReports: '/api/qa/bug-reports'
  }
};

function fillPath(path, params) {
  return Object.keys(params || {}).reduce((nextPath, key) => {
    return nextPath.replace('{' + key + '}', encodeURIComponent(params[key]));
  }, path);
}

module.exports = {
  ENDPOINTS,
  fillPath
};
