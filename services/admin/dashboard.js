const { request } = require('../api/client');
const { ENDPOINTS, fillPath } = require('../api/endpoints');

function getDevices() {
  return request({
    url: ENDPOINTS.admin.devices,
    method: 'GET'
  }).then((result) => result.list || []);
}

function searchDevices(keyword) {
  const query = (keyword || '').trim();
  return getDevices().then((devices) => {
    if (!query) return devices;
    return devices.filter((device) => {
      return (device.serialNo || '').indexOf(query) !== -1
        || (device.boundUserPhone || '').indexOf(query) !== -1;
    });
  });
}

function forceUnbindDevice(deviceId, reason) {
  return request({
    url: fillPath(ENDPOINTS.admin.deviceUnbind, { id: deviceId }),
    method: 'POST',
    data: { reason: reason || 'admin_request' }
  });
}

function getServiceRecords() {
  return request({
    url: ENDPOINTS.admin.serviceRecords,
    method: 'GET'
  }).then((result) => result.list || []);
}

function getFeedbacks() {
  return request({
    url: ENDPOINTS.admin.feedbacks,
    method: 'GET'
  }).then((result) => result.list || []);
}

function updateFeedback(id, patch) {
  return request({
    url: fillPath(ENDPOINTS.admin.feedbackDetail, { id }),
    method: 'PATCH',
    data: patch || {}
  });
}

module.exports = {
  forceUnbindDevice,
  getDevices,
  getFeedbacks,
  getServiceRecords,
  searchDevices,
  updateFeedback
};
