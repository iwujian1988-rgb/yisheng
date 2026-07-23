const history = require('../../services/transfer/local-history');
const bleLink = require('../../services/device/ble-link');
const draftService = require('../../services/content/draft');

Page({
  data: {
    keyword: '',
    items: [],
    connected: false
  },

  onLoad() {
    this.refresh();
  },

  onShow() {
    this.refresh();
    this.checkConnection();
  },

  checkConnection() {
    this.setData({ connected: bleLink.isBleLinkReady() });
  },

  refresh() {
    this.setData({ items: history.search(this.data.keyword) });
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value }, this.refresh);
  },

  resend(e) {
    const id = e.currentTarget.dataset.id;
    const record = this.data.items.find((item) => item.id === id);
    if (!record) return;
    draftService.saveDraft(record.text, 'history_resend');
    if (!this.data.connected) {
      wx.showToast({ title: '已填充到首页，请连接后发送', icon: 'none' });
    } else {
      wx.showToast({ title: '已填充到首页', icon: 'success' });
    }
    setTimeout(() => {
      wx.switchTab({ url: '/pages/home/home', fail: () => wx.reLaunch({ url: '/pages/home/home' }) });
    }, 400);
  },

  copy(e) {
    const id = e.currentTarget.dataset.id;
    const record = this.data.items.find((item) => item.id === id);
    if (!record) return;
    wx.setClipboardData({
      data: record.text,
      success: () => wx.showToast({ title: '已复制', icon: 'success' })
    });
  },

  remove(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '此条历史记录将被删除。',
      confirmText: '删除',
      confirmColor: '#F5222D',
      success: (res) => {
        if (!res.confirm) return;
        this.setData({ items: history.removeRecord(id) });
        wx.showToast({ title: '已删除', icon: 'success' });
      }
    });
  },

  clearAll() {
    if (this.data.items.length === 0) return;
    wx.showModal({
      title: '清空全部',
      content: '将清空所有历史记录，无法恢复。',
      confirmText: '清空',
      confirmColor: '#F5222D',
      success: (res) => {
        if (!res.confirm) return;
        this.setData({ items: history.clearAll() });
        wx.showToast({ title: '已清空', icon: 'success' });
      }
    });
  }
});
