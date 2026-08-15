const apiClient = require('../api/client');
const endpoints = require('../api/endpoints');

function path(template, params) {
  return endpoints.fillPath(template, params || {});
}

function createWorkspace(templateId, detailLevel) {
  return apiClient.request({
    url: endpoints.ENDPOINTS.aiWorkspaces.create,
    method: 'POST',
    data: { templateId: templateId, detailLevel: detailLevel || 'standard' }
  }).then(function (data) { return data.workspace; });
}

function getWorkspace(id) {
  return apiClient.request({ url: path(endpoints.ENDPOINTS.aiWorkspaces.detail, { id: id }), method: 'GET' })
    .then(function (data) { return data.workspace; });
}

function updateWorkspace(id, changes) {
  return apiClient.request({ url: path(endpoints.ENDPOINTS.aiWorkspaces.detail, { id: id }), method: 'PATCH', data: changes || {} })
    .then(function (data) { return data.workspace; });
}

function saveField(id, fieldKey, value) {
  return apiClient.request({
    url: path(endpoints.ENDPOINTS.aiWorkspaces.fields, { id: id }), method: 'POST',
    data: { fieldKey: fieldKey, value: value }
  }).then(function (data) { return data.workspace; });
}

function addMaterial(id, material) {
  return apiClient.request({
    url: path(endpoints.ENDPOINTS.aiWorkspaces.materials, { id: id }), method: 'POST', data: material || {}
  });
}

function updateMaterial(id, materialId, status) {
  return apiClient.request({
    url: path(endpoints.ENDPOINTS.aiWorkspaces.materialDetail, { id: id, materialId: materialId }),
    method: 'PATCH', data: { status: status }
  });
}

function createGeneration(id, options) {
  var data = typeof options === 'string' ? { idempotencyKey: options } : (options || {});
  return apiClient.request({
    url: path(endpoints.ENDPOINTS.aiWorkspaces.generations, { id: id }), method: 'POST',
    data: data
  }).then(function (data) { return data.generation; });
}

module.exports = { addMaterial, createGeneration, createWorkspace, getWorkspace, saveField, updateMaterial, updateWorkspace };
