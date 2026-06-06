const ENDPOINTS = {
  auth: {
    login: '/api/auth/login',
    wechatLogin: '/api/auth/wechat-login',
    registerCode: '/api/auth/register-code',
    register: '/api/auth/register',
    resetCode: '/api/auth/reset-code',
    resetPassword: '/api/auth/reset-password',
    me: '/api/auth/me'
  },
  admin: {
    paidUsers: '/api/admin/paid-users',
    paidUserDetail: '/api/admin/paid-users/{id}',
    devices: '/api/admin/devices',
    serviceRecords: '/api/admin/service-records',
    feedbacks: '/api/admin/feedbacks',
    activationCodes: '/api/admin/activation-codes',
    activationCodesImport: '/api/admin/activation-codes/import',
    auditLogs: '/api/admin/audit-logs'
  },
  devices: {
    mine: '/api/devices/me',
    bind: '/api/devices/bind',
    unbind: '/api/devices/unbind',
    firmware: '/api/devices/firmware'
  },
  purchase: {
    activate: '/api/purchase/activate',
    records: '/api/purchase/records',
    entitlement: '/api/purchase/entitlement'
  },
  content: {
    history: '/api/content/history',
    historyDetail: '/api/content/history/{id}',
    drafts: '/api/content/drafts'
  },
  ai: {
    assistant: '/api/ai/assistant',
    templates: '/api/ai/templates',
    templateDetail: '/api/ai/templates/{id}',
    templateGenerate: '/api/ai/templates/{id}/generate',
    redactionPreview: '/api/ai/redaction-preview'
  },
  ocr: {
    recognize: '/api/ocr/recognize'
  },
  asr: {
    transcribe: '/api/asr/transcribe'
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
