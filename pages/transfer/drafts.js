const draftService = require('../../services/content/draft');

Page({
  data: {
    drafts: []
  },

  onLoad() {
    this.refreshDrafts();
  },

  onShow() {
    this.refreshDrafts();
  },

  refreshDrafts() {
    const draft = draftService.peekDraft();
    const drafts = draft && draft.text
      ? [{
        id: 'pending',
        preview: draft.text.slice(0, 80),
        source: draft.source || 'manual',
        updatedAt: draft.updatedAt || Date.now()
      }]
      : [];
    this.setData({ drafts });
  },

  editDraft() {
    wx.reLaunch({ url: '/pages/home/home' });
  },

  deleteDraft() {
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复。',
      confirmText: '删除',
      confirmColor: '#F5222D',
      success: (res) => {
        if (res.confirm) {
          draftService.clearDraft();
          this.refreshDrafts();
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  }
});
