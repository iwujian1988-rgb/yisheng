const QA_STATE_KEY = 'qaChecklistState';
const LONG_TEXT_RECORDS_KEY = 'qaLongTextRecords';
const BUG_REPORTS_KEY = 'qaBugReports';
const longText = require('./long-text');
const { request, getBaseUrl } = require('../api/client');
const { ENDPOINTS } = require('../api/endpoints');

function getState(name) {
  const state = wx.getStorageSync(QA_STATE_KEY) || {};
  return state[name] || [];
}

function saveState(name, checkedIds) {
  const state = wx.getStorageSync(QA_STATE_KEY) || {};
  state[name] = checkedIds || [];
  wx.setStorageSync(QA_STATE_KEY, state);
  return state[name];
}

function getChecklistSummary(name, total) {
  const checkedIds = getState(name);
  const passCount = checkedIds.length;
  const failCount = Math.max(0, (total || 0) - passCount);
  return {
    passCount,
    failCount,
    total: total || passCount
  };
}

function getLongTextRecords() {
  const records = wx.getStorageSync(LONG_TEXT_RECORDS_KEY);
  return Array.isArray(records) ? records : [];
}

function createLongTextTestRecord() {
  const record = longText.createPendingRecord();
  const records = [record].concat(getLongTextRecords());
  wx.setStorageSync(LONG_TEXT_RECORDS_KEY, records);
  return record;
}

function updateLongTextTestRecord(recordId, payload) {
  const records = getLongTextRecords();
  const index = records.findIndex((record) => record.id === recordId);

  if (index === -1) {
    return null;
  }

  const nextRecord = Object.assign({}, records[index], payload || {}, {
    updatedAt: Date.now()
  });

  records[index] = nextRecord;
  wx.setStorageSync(LONG_TEXT_RECORDS_KEY, records);
  return nextRecord;
}

function submitLongTextResult(recordId, payload) {
  const sourceText = longText.createTestText(payload && payload.charCount ? payload.charCount : longText.TARGET_CHAR_COUNT);
  const evaluation = longText.evaluateResult({
    sourceText,
    outputText: payload.outputText || '',
    elapsedMs: payload.elapsedMs,
    failureCategory: payload.failureCategory
  });

  const updated = updateLongTextTestRecord(recordId, {
    status: evaluation.status,
    pass: evaluation.pass,
    elapsed: evaluation.elapsed,
    elapsedMs: evaluation.elapsedMs,
    failureCategory: evaluation.failureCategory,
    outputTextLength: evaluation.comparison.outputLength,
    exactMatch: evaluation.comparison.exactMatch,
    firstDiffIndex: evaluation.comparison.firstDiffIndex,
    missingCount: evaluation.comparison.missingCount,
    extraCount: evaluation.comparison.extraCount,
    checkedAt: Date.now()
  });

  if (updated && getBaseUrl()) {
    request({
      url: ENDPOINTS.qa.longTextTests,
      method: 'POST',
      data: {
        charCount: updated.charCount,
        elapsedMs: updated.elapsedMs,
        passed: updated.pass,
        mode: payload.mode || '',
        failureCategory: updated.failureCategory
      }
    }).catch(() => {});
  }

  return updated;
}

function getBugReports() {
  const reports = wx.getStorageSync(BUG_REPORTS_KEY);
  return Array.isArray(reports) ? reports : [];
}

function submitBugReport(payload) {
  const report = {
    id: 'bug_' + Date.now(),
    type: payload.type || '',
    stepsLength: (payload.steps || '').length,
    hasExpected: Boolean(payload.expected),
    hasActual: Boolean(payload.actual),
    createdAt: Date.now()
  };

  if (!report.type || !report.stepsLength) {
    return Promise.reject({
      code: 'BUG_REPORT_REQUIRED',
      message: '请选择问题类型并填写复现步骤'
    });
  }

  if (getBaseUrl()) {
    return request({
      url: ENDPOINTS.qa.bugReports,
      method: 'POST',
      data: report
    });
  }

  const reports = [report].concat(getBugReports());
  wx.setStorageSync(BUG_REPORTS_KEY, reports);
  return Promise.resolve(report);
}

module.exports = {
  getState,
  saveState,
  getChecklistSummary,
  getLongTextRecords,
  createLongTextTestRecord,
  updateLongTextTestRecord,
  submitLongTextResult,
  getBugReports,
  submitBugReport
};
