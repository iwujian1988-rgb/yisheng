var templateCatalog = require('../../services/templates/catalog');
var featureEntitlements = require('../../services/entitlements/features');

var TEMPLATE_TYPES = ['首次病程记录', '出院记录', '72小时谈话记录', '大病历', '会诊记录', '通用'];

Page({
  data: {
    templateTypes: TEMPLATE_TYPES,
    templateTypeIndex: 0,
    templateName: '',
    content: '',
    saving: false
  },

  onLoad: function () {
    if (!featureEntitlements.guardAiFeature('templates', '场景模板')) {
      wx.navigateBack({ fail: function () { wx.reLaunch({ url: '/pages/home/home' }); } });
    }
  },

  onTypeChange: function (e) {
    this.setData({ templateTypeIndex: Number(e.detail.value || 0) });
  },

  onNameInput: function (e) {
    this.setData({ templateName: e.detail.value || '' });
  },

  onContentInput: function (e) {
    this.setData({ content: e.detail.value || '' });
  },

  goCamera: function () {
    var that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      success: function (res) {
        var path = res.tempFilePaths[0];
        wx.getFileSystemManager().readFile({
          filePath: path,
          encoding: 'base64',
          success: function (fileRes) {
            that._recognizeImage('data:image/jpeg;base64,' + fileRes.data);
          }
        });
      }
    });
  },

  _recognizeImage: function (imageBase64) {
    var that = this;
    var request = require('../../services/api/client').request;
    var ENDPOINTS = require('../../services/api/endpoints').ENDPOINTS;
    wx.showLoading({ title: '识别中...', mask: true });
    request({
      url: ENDPOINTS.ocr.recognize,
      method: 'POST',
      data: { imageBase64: imageBase64 }
    }).then(function (result) {
      wx.hideLoading();
      var text = result.text || '';
      if (text) {
        that.setData({ content: text });
      } else {
        wx.showToast({ title: '未识别到文字', icon: 'none' });
      }
    }).catch(function (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '识别失败', icon: 'none' });
    });
  },

  pasteFromClipboard: function () {
    var that = this;
    wx.getClipboardData({
      success: function (res) {
        if (res.data) that.setData({ content: res.data });
      }
    });
  },

  saveTemplate: function () {
    var content = this.data.content.trim();
    if (!content) {
      wx.showToast({ title: '请输入或识别模板范文', icon: 'none' });
      return;
    }
    var templateType = this.data.templateTypes[this.data.templateTypeIndex] || '通用';
    var templateName = this.data.templateName.trim() || ('我的' + templateType + '模板');
    var that = this;
    this.setData({ saving: true });
    templateCatalog.runTemplateAgent({
      templateType: templateType,
      templateName: templateName,
      content: content
    }).then(function (result) {
      var draft = result.templateDraft;
      if (!draft) {
        throw new Error('未生成模板草稿');
      }
      draft.name = templateName;
      return templateCatalog.saveTemplate(draft);
    }).then(function () {
      that.setData({ saving: false });
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(function () {
        wx.navigateBack();
      }, 800);
    }).catch(function (err) {
      that.setData({ saving: false });
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    });
  }
});
