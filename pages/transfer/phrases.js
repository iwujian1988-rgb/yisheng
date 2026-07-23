const phrases = require('../../services/transfer/local-phrases');
const bleLink = require('../../services/device/ble-link');
const draftService = require('../../services/content/draft');

Page({
  data: {
    selectedCategory: 'all',
    categories: ['all'],
    items: [],
    connected: false,
    showAdd: false,
    newText: '',
    newCategory: ''
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
    const cats = ['all'].concat(phrases.listCategories());
    const items = phrases.filterByCategory(this.data.selectedCategory);
    this.setData({ categories: cats, items });
  },

  selectCategory(e) {
    this.setData({ selectedCategory: e.currentTarget.dataset.cat }, this.refresh);
  },

  send(e) {
    const id = e.currentTarget.dataset.id;
    const phrase = this.data.items.find((item) => item.id === id);
    if (!phrase) return;
    draftService.saveDraft(phrase.text, 'phrase');
    wx.showToast({ title: '已填充到首页', icon: 'success' });
    setTimeout(() => {
      wx.switchTab({ url: '/pages/home/home', fail: () => wx.reLaunch({ url: '/pages/home/home' }) });
    }, 400);
  },

  copy(e) {
    const id = e.currentTarget.dataset.id;
    const phrase = this.data.items.find((item) => item.id === id);
    if (!phrase) return;
    wx.setClipboardData({
      data: phrase.text,
      success: () => wx.showToast({ title: '已复制', icon: 'success' })
    });
  },

  remove(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除短语',
      content: '确定删除此短语？',
      confirmText: '删除',
      confirmColor: '#F5222D',
      success: (res) => {
        if (!res.confirm) return;
        this.setData({ items: phrases.removePhrase(id) }, this.refresh);
        wx.showToast({ title: '已删除', icon: 'success' });
      }
    });
  },

  openAdd() {
    this.setData({ showAdd: true, newText: '', newCategory: this.data.selectedCategory === 'all' ? '' : this.data.selectedCategory });
  },

  closeAdd() {
    this.setData({ showAdd: false });
  },

  onTextInput(e) {
    this.setData({ newText: e.detail.value });
  },

  onCategoryInput(e) {
    this.setData({ newCategory: e.detail.value });
  },

  confirmAdd() {
    if (!this.data.newText.trim()) {
      wx.showToast({ title: '请输入短语内容', icon: 'none' });
      return;
    }
    phrases.addPhrase(this.data.newText.trim(), this.data.newCategory.trim() || '通用');
    this.setData({ showAdd: false, newText: '', newCategory: '' }, this.refresh);
    wx.showToast({ title: '已添加', icon: 'success' });
  }
});
