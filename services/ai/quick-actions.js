var request = require('../api/client').request;
var ENDPOINTS = require('../api/endpoints').ENDPOINTS;
var isBluetoothConnected = require('../entitlements/features').isBluetoothConnected;

function listQuickActions() {
  return request({
    url: ENDPOINTS.ai.quickActions,
    method: 'GET',
    data: { deviceConnected: isBluetoothConnected() }
  }).then(function (data) {
    if (data && Array.isArray(data.quickActions)) return data;
    return { defaultPrompt: '', categories: [], quickActions: [] };
  }).catch(function () {
    return { defaultPrompt: '', categories: [], quickActions: [] };
  });
}

module.exports = {
  listQuickActions: listQuickActions
};
