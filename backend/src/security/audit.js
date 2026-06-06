const { createId, nowIso } = require('./ids');

function writeAudit(store, options) {
  var actor = options.actor || {};
  var item = {
    id: createId('audit'),
    operatorId: actor.id || '',
    operatorAccount: actor.account || '',
    ip: options.ip || '',
    module: options.module,
    actionType: options.actionType,
    targetId: options.targetId || '',
    result: options.result || 'success',
    beforeJson: options.beforeJson || null,
    afterJson: options.afterJson || null,
    detail: options.detail || '',
    createdAt: nowIso()
  };
  store.auditLogs.unshift(item);
  return item;
}

module.exports = {
  writeAudit
};
