var request = require('../api/client').request;
var ENDPOINTS = require('../api/endpoints').ENDPOINTS;

function listQuickActions(connected) {
  var url = ENDPOINTS.ai.quickActions;
  return request({
    url: url,
    method: 'GET'
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
