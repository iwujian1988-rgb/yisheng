const HISTORY_KEY = 'transferHistoryRecords';
const DRAFT_KEY = 'pendingTransferDraft';
const DEVICE_CACHE_KEYS = [
  'boundDevice'
];

function clearHistory() {
  wx.removeStorageSync(HISTORY_KEY);
  return { cleared: ['history'] };
}

function clearDrafts() {
  wx.removeStorageSync(DRAFT_KEY);
  return { cleared: ['drafts'] };
}

function clearDeviceCache() {
  DEVICE_CACHE_KEYS.forEach((key) => wx.removeStorageSync(key));
  return { cleared: ['deviceCache'] };
}

function clearLocalContentData() {
  clearHistory();
  clearDrafts();
  return { cleared: ['history', 'drafts'] };
}

function getLocalDataSummary() {
  const history = wx.getStorageSync(HISTORY_KEY);
  const draft = wx.getStorageSync(DRAFT_KEY);
  const device = wx.getStorageSync('boundDevice');

  return {
    historyCount: Array.isArray(history) ? history.length : 0,
    hasDraft: Boolean(draft && draft.text),
    hasDeviceCache: Boolean(device)
  };
}

module.exports = {
  clearHistory,
  clearDrafts,
  clearDeviceCache,
  clearLocalContentData,
  getLocalDataSummary
};
