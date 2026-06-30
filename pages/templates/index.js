var templateCatalog = require('../../services/templates/catalog');
var featureEntitlements = require('../../services/entitlements/features');
var tabBarNav = require('../../services/navigation/tab-bar');

Page({
  data: {
    activeTab: 'custom',
    tabs: [
      { key: 'custom', name: '自有模板' },
      { key: 'official', name: '官方模板' },
      { key: 'all', name: '全部' }
    ],
    templates: [],
    filteredTemplates: [],
    isLoading: false,
    loadError: ''
  },

  onLoad: function () {
    this.loadTemplates();
  },

  onShow: function () {
    tabBarNav.syncTabBar(this, 'pages/templates/index');
    if (!featureEntitlements.guardAiFeature('templates', '场景模板')) {
      wx.switchTab({ url: '/pages/home/home' });
      return;
    }
    this.loadTemplates();
  },

  loadTemplates: function () {
    var that = this;
    this.setData({ isLoading: true, loadError: '' });
    templateCatalog.listTemplates().then(function (result) {
      var templates = result.templates || [];
      that.setData({
        templates: templates,
        isLoading: false
      });
      that.applyFilter();
    }).catch(function (err) {
      that.setData({
        templates: [],
        filteredTemplates: [],
        isLoading: false,
        loadError: err.message || '模板加载失败'
      });
    });
  },

  switchTab: function (e) {
    this.setData({ activeTab: e.currentTarget.dataset.key });
    this.applyFilter();
  },

  applyFilter: function () {
    var activeTab = this.data.activeTab;
    var hideProfessional = !featureEntitlements.hasDeviceSession();
    var filtered = (this.data.templates || []).filter(function (item) {
      if (hideProfessional && item.audience === 'professional' && item.tag === 'official') {
        return false;
      }
      if (activeTab === 'all') return true;
      if (activeTab === 'official') return item.tag === 'official';
      if (activeTab === 'custom') return item.tag === 'custom';
      return true;
    });
    this.setData({ filteredTemplates: filtered });
  },

  openTemplate: function (e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/templates/detail?id=' + encodeURIComponent(id) });
  },

  goCreate: function () {
    wx.navigateTo({ url: '/pages/templates/create' });
  }
});
