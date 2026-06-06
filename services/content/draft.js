const DRAFT_KEY = 'pendingTransferDraft';

function saveDraft(text, source) {
  const draft = {
    text: text || '',
    source: source || 'manual',
    updatedAt: Date.now()
  };
  wx.setStorageSync(DRAFT_KEY, draft);
  return draft;
}

function consumeDraft() {
  const draft = wx.getStorageSync(DRAFT_KEY);
  if (draft && draft.text) {
    wx.removeStorageSync(DRAFT_KEY);
    return draft;
  }
  return null;
}

function peekDraft() {
  return wx.getStorageSync(DRAFT_KEY) || null;
}

function clearDraft() {
  wx.removeStorageSync(DRAFT_KEY);
}

module.exports = {
  saveDraft,
  consumeDraft,
  peekDraft,
  clearDraft
};
