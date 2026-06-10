const templateCatalog = require('../../services/templates/catalog');

Page({
  data: {
    activeTab: 'all',
    tabs: [
      { key: 'all', name: '全部' }
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
      .then((result) => {
        var templates = result.templates || [];
        var categories = result.categories || [];
        var tabs = [{ key: 'all', name: '全部' }].concat(
          categories.map(function (c) { return { key: c, name: c }; })
        );
        this.setData({
          templates: templates,
          tabs: tabs,
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
    var activeTab = this.data.activeTab;
    var filteredTemplates = (this.data.templates || []).filter((item) => {
      if (activeTab === 'all') return true;
      return (item.category || item.scene || '') === activeTab;
    });
    this.setData({ filteredTemplates });
  },

  openTemplate(e) {
    var id = e.currentTarget.dataset.id;
    var template = (this.data.templates || []).find((item) => item.id === id);
    if (!template) {
      wx.showToast({ title: '模板不可用', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: '/pages/templates/detail?template=' + encodeURIComponent(JSON.stringify(template))
    });
  }
});
