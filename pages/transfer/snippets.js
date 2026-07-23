const snippets = require('../../services/transfer/local-snippets');
const bleLink = require('../../services/device/ble-link');
const draftService = require('../../services/content/draft');

Page({
  data: {
    keyword: '',
    items: [],
    connected: false,
    showEditor: false,
    editId: '',
    editTitle: '',
    editText: '',
    editCategory: ''
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
    this.setData({ items: snippets.search(this.data.keyword) });
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value }, this.refresh);
  },

  send(e) {
    const id = e.currentTarget.dataset.id;
    const snippet = this.data.items.find((item) => item.id === id);
    if (!snippet) return;
    draftService.saveDraft(snippet.text, 'snippet');
    wx.showToast({ title: '已填充到首页', icon: 'success' });
    setTimeout(() => {
      wx.switchTab({ url: '/pages/home/home', fail: () => wx.reLaunch({ url: '/pages/home/home' }) });
    }, 400);
  },

  copy(e) {
    const id = e.currentTarget.dataset.id;
    const snippet = this.data.items.find((item) => item.id === id);
    if (!snippet) return;
    wx.setClipboardData({
      data: snippet.text,
      success: () => wx.showToast({ title: '已复制', icon: 'success' })
    });
  },

  openAdd() {
    this.setData({
      showEditor: true,
      editId: '',
      editTitle: '',
      editText: '',
      editCategory: ''
    });
  },

  openEdit(e) {
    const id = e.currentTarget.dataset.id;
    const snippet = this.data.items.find((item) => item.id === id);
    if (!snippet) return;
    this.setData({
      showEditor: true,
      editId: snippet.id,
      editTitle: snippet.title,
      editText: snippet.text,
      editCategory: snippet.category
    });
  },

  closeEditor() {
    this.setData({ showEditor: false });
  },

  onTitleInput(e) { this.setData({ editTitle: e.detail.value }); },
  onTextInput(e) { this.setData({ editText: e.detail.value }); },
  onCategoryInput(e) { this.setData({ editCategory: e.detail.value }); },

  saveSnippet() {
    if (!this.data.editText.trim()) {
      wx.showToast({ title: '请输入片段内容', icon: 'none' });
      return;
    }
    if (this.data.editId) {
      snippets.updateSnippet(this.data.editId, {
        title: this.data.editTitle,
        text: this.data.editText,
        category: this.data.editCategory || '通用'
      });
    } else {
      snippets.addSnippet({
        title: this.data.editTitle,
        text: this.data.editText,
        category: this.data.editCategory
      });
    }
    this.setData({ showEditor: false }, this.refresh);
    wx.showToast({ title: '已保存', icon: 'success' });
  },

  remove(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除片段',
      content: '确定删除此片段？',
      confirmText: '删除',
      confirmColor: '#F5222D',
      success: (res) => {
        if (!res.confirm) return;
        this.setData({ items: snippets.removeSnippet(id) });
        wx.showToast({ title: '已删除', icon: 'success' });
      }
    });
  }
});
