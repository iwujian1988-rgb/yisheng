const qaState = require('../qa/check-state');
const transferQueue = require('../transfer/queue');

const LONG_TEXT_TARGET = '3000 chars / 120 seconds';

function getLongTextSummary() {
  const records = qaState.getLongTextRecords();
  const passed = records.filter((record) => record.status === 'passed').length;
  const failed = records.filter((record) => record.status === 'failed').length;
  const passedElapsed = records
    .filter((record) => record.status === 'passed' && record.elapsedMs)
    .map((record) => record.elapsedMs);
  const maxChars = records.reduce((max, record) => Math.max(max, record.charCount || 0), 0);

  return {
    target: LONG_TEXT_TARGET,
    totalCount: records.length,
    failedCount: failed,
    maxChars,
    fastestPassedMs: passedElapsed.length ? Math.min.apply(null, passedElapsed) : 0,
    passRate: records.length ? Math.round((passed / records.length) * 100) : 0,
    records
  };
}

function getTransferPerformance() {
  const queueItems = transferQueue.getQueueItems();
  const longText = getLongTextSummary();
  return Promise.resolve({
    avgTime: 0,
    failCount: queueItems.filter((item) => item.status === 'error').length,
    cancelCount: queueItems.filter((item) => item.status === 'cancelled').length,
    maxChars: longText.maxChars || 0
  });
}

function getAiUsage() {
  return {
    callCount: 0,
    redactCount: 0,
    approveCount: 0,
    sendCount: 0
  };
}

function getOcrAsrUsage() {
  return {
    ocrCount: 0,
    asrCount: 0,
    confirmCount: 0,
    discardCount: 0
  };
}

module.exports = {
  LONG_TEXT_TARGET,
  getLongTextSummary,
  getTransferPerformance,
  getAiUsage,
  getOcrAsrUsage
};
