const { request } = require('../api/client');
const { ENDPOINTS } = require('../api/endpoints');

function getAuditLogs() {
  return request({
    url: ENDPOINTS.admin.auditLogs,
    method: 'GET'
  });
}

function addAuditLog() {
  return Promise.reject({
    code: 'AUDIT_LOG_BACKEND_ONLY',
    message: '审计日志由后端自动记录'
  });
}

module.exports = {
  getAuditLogs,
  addAuditLog
};
