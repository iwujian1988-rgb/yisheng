const templateCatalog = require('../../services/templates/catalog');

Page({
  data: {
    activeTab: 'office',
    tabs: [
      { key: 'office', name: '办公' },
      { key: 'report', name: '汇报' },
      { key: 'email', name: '邮件' },
      { key: 'notice', name: '通知' }
    ],
    templates: [],
    filteredTemplates: [],
    isLoading: false,
    loadError: ''
  },

  onLoad() {
    this.loadTemplates();
  },

  loadTemplates() {
    this.setData({ isLoading: true, loadError: '' });
    templateCatalog.listTemplates()
      .then((templates) => {
        this.setData({
          templates: templates || [],
          isLoading: false
        });
        this.applyFilter();
      })
      .catch((err) => {
        this.setData({
          templates: [],
          filteredTemplates: [],
          isLoading: false,
          loadError: err.message || '模板加载失败'
        });
      });
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.key });
    this.applyFilter();
  },

  applyFilter() {
    const activeTab = this.data.activeTab;
    const filteredTemplates = (this.data.templates || []).filter((item) => {
      return (item.category || item.scene || 'office') === activeTab;
    });
    this.setData({ filteredTemplates });
  },

  openTemplate(e) {
    const id = e.currentTarget.dataset.id;
    const template = (this.data.templates || []).find((item) => item.id === id);
    if (!template) {
      wx.showToast({ title: '模板不可用', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: '/pages/templates/detail?template=' + encodeURIComponent(JSON.stringify(template))
    });
  }
});
