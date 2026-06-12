var request = require('../../services/api/client').request;
var ENDPOINTS = require('../../services/api/endpoints').ENDPOINTS;
var featureEntitlements = require('../../services/entitlements/features');

Page({
  data: {
    name: '',
    content: '',
    source: 'paste',
    saving: false
  },

  onLoad: function () {
    if (!featureEntitlements.guardAiFeature('aiWriting', '智能创作')) {
      wx.navigateBack({
        fail: function () { wx.reLaunch({ url: '/pages/home/home' }); }
      });
    }
  },

  onNameInput: function (e) {
    this.setData({ name: e.detail.value || '' });
  },

  onContentInput: function (e) {
    this.setData({ content: e.detail.value || '', source: 'paste' });
  },

  goCamera: function () {
    var that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      success: function (res) {
        var tempPath = res.tempFilePaths[0];
        wx.getFileSystemManager().readFile({
          filePath: tempPath,
          encoding: 'base64',
          success: function (fileRes) {
            var base64 = 'data:image/jpeg;base64,' + fileRes.data;
            that._recognizeImage(base64);
          }
        });
      }
    });
  },

  _recognizeImage: function (imageBase64) {
    var that = this;
    wx.showLoading({ title: '识别中...' });
    request({
      url: ENDPOINTS.ocr.recognize,
      method: 'POST',
      data: { imageBase64: imageBase64 }
    }).then(function (result) {
      wx.hideLoading();
      var text = result.text || '';
      if (text) {
        that.setData({ content: text, source: 'ocr' });
      } else {
        wx.showToast({ title: '未识别到文字', icon: 'none' });
      }
    }).catch(function () {
      wx.hideLoading();
      wx.showToast({ title: '识别失败', icon: 'none' });
    });
  },

  pasteFromClipboard: function () {
    var that = this;
    wx.getClipboardData({
      success: function (res) {
        if (res.data) {
          that.setData({ content: res.data, source: 'paste' });
        }
      }
    });
  },

  saveTemplate: function () {
    var name = this.data.name.trim();
    var content = this.data.content.trim();
    if (!name) {
      wx.showToast({ title: '请输入模板名称', icon: 'none' });
      return;
    }
    if (!content) {
      wx.showToast({ title: '请输入或识别模板内容', icon: 'none' });
      return;
    }
    this.setData({ saving: true });
    var that = this;
    request({
      url: ENDPOINTS.ai.userTemplates,
      method: 'POST',
      data: { name: name, content: content, source: that.data.source }
    }).then(function () {
      that.setData({ saving: false });
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(function () {
        wx.navigateBack();
      }, 1000);
    }).catch(function (err) {
      that.setData({ saving: false });
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    });
  }
});
