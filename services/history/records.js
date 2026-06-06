const { request, getBaseUrl } = require('../api/client');
const { ENDPOINTS, fillPath } = require('../api/endpoints');
const crypto = require('../security/crypto');

const HISTORY_KEY = 'transferHistoryRecords';

function createId() {
  return 'history_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

function sourceLabel(source) {
  const labels = {
    manual: '手动输入',
    ocr: '图片识别',
    asr: '录音转写',
    ai: 'AI 整理',
    template: '模板生成',
    qa_long_text: '长文本测试'
  };
  return labels[source] || '文本';
}

function formatTime(timestamp) {
  const date = new Date(timestamp || Date.now());
  const pad = (value) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('-') + ' ' + [
    pad(date.getHours()),
    pad(date.getMinutes())
  ].join(':');
}

function normalizeRecord(record) {
  const payload = record || {};
  return {
    id: payload.id || createId(),
    source: payload.source || 'manual',
    status: payload.status || 'success',
    success: payload.success !== false && payload.status !== 'failed',
    textLength: Number(payload.textLength || 0),
    createdAt: payload.createdAt || Date.now(),
    protectedPayload: payload.protectedPayload || null,
    ciphertext: payload.ciphertext || '',
    envelope: payload.envelope || null
  };
}

function toListItem(record) {
  const normalized = normalizeRecord(record);
  return {
    id: normalized.id,
    source: normalized.source,
    type: sourceLabel(normalized.source),
    status: normalized.status,
    success: normalized.success,
    textLength: normalized.textLength,
    length: normalized.textLength + ' 字',
    time: formatTime(normalized.createdAt),
    createdAt: normalized.createdAt,
    preview: '内容已保护，仅展示来源、时间和字数。'
  };
}

function getLocalRawRecords() {
  const records = wx.getStorageSync(HISTORY_KEY);
  return Array.isArray(records) ? records.map(normalizeRecord) : [];
}

function saveLocalRawRecords(records) {
  wx.setStorageSync(HISTORY_KEY, records.map(normalizeRecord));
}

function getHistoryRecords() {
  if (!getBaseUrl()) {
    return Promise.resolve(getLocalRawRecords().map(toListItem));
  }

  return request({
    url: ENDPOINTS.content.history,
    method: 'GET'
  }).then((records) => {
    const list = Array.isArray(records) ? records : [];
    return list.map(toListItem);
  });
}

function buildProtectedRecord(payload) {
  const text = payload.text || '';
  const meta = crypto.createContentMetadata(text, {
    source: payload.source || 'manual',
    status: payload.status || 'success'
  });
  const protectedPayload = crypto.protectPlaintext(text, meta);

  return normalizeRecord({
    id: payload.id,
    source: meta.source,
    status: meta.status,
    success: payload.success !== false,
    textLength: meta.textLength,
    createdAt: payload.createdAt || Date.now(),
    protectedPayload
  });
}

function saveHistoryRecord(payload) {
  const record = buildProtectedRecord(payload || {});

  if (!getBaseUrl()) {
    const nextRecords = [record].concat(getLocalRawRecords());
    saveLocalRawRecords(nextRecords);
    return Promise.resolve(toListItem(record));
  }

  return request({
    url: ENDPOINTS.content.history,
    method: 'POST',
    data: {
      id: record.id,
      ciphertext: record.protectedPayload.ciphertext,
      envelope: record.protectedPayload.envelope,
      source: record.source,
      status: record.status,
      success: record.success,
      textLength: record.textLength,
      createdAt: record.createdAt
    }
  }).then((savedRecord) => toListItem(Object.assign({}, record, savedRecord || {})));
}

function getProtectedRecordById(id) {
  if (!getBaseUrl()) {
    return Promise.resolve(getLocalRawRecords().find((record) => record.id === id) || null);
  }

  return request({
    url: fillPath(ENDPOINTS.content.historyDetail, { id }),
    method: 'GET'
  });
}

module.exports = {
  getHistoryRecords,
  saveHistoryRecord,
  getProtectedRecordById
};
