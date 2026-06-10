const { request, getBaseUrl } = require('../api/client');
const { ENDPOINTS, fillPath } = require('../api/endpoints');
const crypto = require('../security/crypto');

const HISTORY_KEY = 'transferHistoryRecords';

function createId() {
  return 'history_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

function sourceLabel(source) {
  const labels = {
    manual: '直接编辑',
    ocr: 'OCR识别',
    asr: '语音记录',
    ai: 'AI润色',
    template: '模板',
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

function hasToken() {
  return Boolean(wx.getStorageSync('token'));
}

function getHistoryRecords() {
  if (!getBaseUrl() || !hasToken()) {
    return Promise.resolve(getLocalRawRecords().map(toListItem));
  }

  return request({
    url: ENDPOINTS.content.history,
    method: 'GET'
  }).then((records) => {
    const list = Array.isArray(records) ? records : [];
    return list.map(toListItem);
  }).catch((error) => {
    if (error && error.statusCode === 401) {
      return getLocalRawRecords().map(toListItem);
    }
    return Promise.reject(error);
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

  if (!getBaseUrl() || !hasToken()) {
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
  if (!getBaseUrl() || !hasToken()) {
    return Promise.resolve(getLocalRawRecords().find((record) => record.id === id) || null);
  }

  return request({
    url: fillPath(ENDPOINTS.content.historyDetail, { id }),
    method: 'GET'
  });
}

function getHistoryDetail(id) {
  return getProtectedRecordById(id).then((record) => {
    const normalized = normalizeRecord(record || {});
    const protectedPayload = normalized.protectedPayload || (
      normalized.ciphertext ? {
        ciphertext: normalized.ciphertext,
        envelope: normalized.envelope || {}
      } : null
    );
    const text = protectedPayload ? crypto.revealPlaintext(protectedPayload) : '';
    return Object.assign({}, toListItem(normalized), {
      text,
      envelope: normalized.envelope || (protectedPayload && protectedPayload.envelope) || null
    });
  });
}

module.exports = {
  getHistoryRecords,
  saveHistoryRecord,
  getProtectedRecordById,
  getHistoryDetail
};
