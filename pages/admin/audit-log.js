const auditLog = require('../../services/admin/audit-log');

Page({
  data: {
    logs: []
  },

  onLoad() {
    this.setData({
      logs: auditLog.getAuditLogs()
    });
  }
});
