var templateCatalog = require('../../services/templates/catalog');
var featureEntitlements = require('../../services/entitlements/features');

Page({
  data: {
    template: null,
    title: '',
    fields: [],
    samplePreview: '',
    hasSample: false
  },

  onLoad: function (options) {
    var that = this;
    featureEntitlements.guardAiFeature('templates', '场景模板').then(function (ok) {
      if (!ok) {
        wx.navigateBack({ fail: function () { wx.reLaunch({ url: '/pages/home/home' }); } });
        return;
      }
      var id = options && options.id ? decodeURIComponent(options.id) : '';
      if (!id) {
        wx.showToast({ title: '模板不存在', icon: 'none' });
        return;
      }
      that.loadTemplate(id);
    });
  },

  loadTemplate: function (id) {
    var that = this;
    templateCatalog.getTemplate(id).then(function (template) {
      var fields = template.fields || [];
      var sample = template.sample || '';
      that.setData({
        template: template,
        title: template.name || '',
        fields: fields,
        samplePreview: sample ? sample.slice(0, 800) : '',
        hasSample: Boolean(sample)
      });
    }).catch(function (err) {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
    });
  },

  useInAi: function () {
    var template = this.data.template;
    if (!template || !template.id) return;
    wx.setStorageSync('selectedTemplateId', template.id);
    wx.switchTab({ url: '/pages/ai/detail' });
  }
});
