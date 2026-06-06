const authSession = require('../auth/session');

function getServiceOverview() {
  const session = authSession.getStoredSessionSummary();
  const device = session.device || {};
  return {
    serviceStatus: session.serviceStatus || '',
    serviceExpiry: '',
    deviceSerial: device.serialNo || '',
    deviceStatus: session.deviceBindingStatus || '',
    lastTransfer: ''
  };
}

function getMessages() {
  return [];
}

function getDataExportInfo() {
  return {
    exportable: ['transfer metadata', 'account service status', 'device binding metadata'],
    notExportable: ['encrypted plaintext payload', 'third-party internal processing records']
  };
}

module.exports = {
  getServiceOverview,
  getMessages,
  getDataExportInfo
};
