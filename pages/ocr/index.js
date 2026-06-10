const ocrRecognizer = require('../../services/ocr/recognizer');
const aiAssistant = require('../../services/ai/assistant');
const draftService = require('../../services/content/draft');
const featureEntitlements = require('../../services/entitlements/features');
const quickActionsService = require('../../services/ai/quick-actions');

function isDeviceConnected() {
  const app = typeof getApp === 'function' ? getApp() : null;
  const globalData = app && app.globalData ? app.globalData : {};
  return Boolean(globalData.skipBluetoothForDev || globalData.deviceConnected);
}

Page({
  data: {
    imageUrl: '',
    resultText: '',
    resultMeta: null,
    recognizing: false,
    formatting: false,
    errorMessage: ''
  },

  onLoad() {
    if (!featureEntitlements.guardAiFeature('ocr', '图片识别')) {
      wx.navigateBack({
        delta: 1,
        fail: () => wx.reLaunch({ url: '/pages/home/home' })
      });
      return;
    }
    if (!isDeviceConnected()) {
      wx.showModal({
        title: '需要连接设备',
        content: '图片识别需要先连接设备，连接后可使用全部功能。',
        confirmText: '去连接',
        cancelText: '返回',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/bluetooth/index' });
          } else {
            wx.navigateBack({
              delta: 1,
              fail: () => wx.reLaunch({ url: '/pages/home/home' })
            });
          }
        }
      });
    }
  },

  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const imageUrl = res.tempFilePaths && res.tempFilePaths[0] ? res.tempFilePaths[0] : '';
        this.setData({
          imageUrl,
          resultText: '',
          resultMeta: null,
          errorMessage: ''
        });
        this.recognizeSelectedImage(imageUrl);
      }
    });
  },

  recognizeSelectedImage(imageUrl) {
    if (!imageUrl) {
      wx.showToast({ title: '请先选择图片', icon: 'none' });
      return;
    }

    this.setData({ recognizing: true, errorMessage: '' });

    ocrRecognizer.recognizeImage({ path: imageUrl })
      .then((result) => {
        this.setData({
          resultText: result && result.text ? result.text : '',
          resultMeta: result ? {
            provider: result.provider || result.engine || '',
            engine: result.engine || result.provider || '',
            status: result.status || 'ok',
            confidence: result.confidence || 0,
            elapsedMs: result.elapsedMs || 0,
            imageBytes: result.imageBytes || 0,
            regionCount: result.regions && result.regions.length ? result.regions.length : 0
          } : null,
          recognizing: false,
          errorMessage: ''
        });
      })
      .catch((error) => {
        this.setData({
          recognizing: false,
          errorMessage: error && error.message ? error.message : '图片识别暂时不可用'
        });
      });
  },

  updateResultText(e) {
    this.setData({ resultText: e.detail.value || '' });
  },

  formatWithAi() {
    const text = this.data.resultText.trim();
    if (!text || this.data.formatting) return;
    this.setData({ formatting: true });
    aiAssistant.generateContent({
      text: '请在不改动原文含义和关键信息的前提下，只做段落、换行、项目符号和排版整理。不要新增信息。\n\n' + text,
      type: 'content_polish'
    }).then((result) => {
      this.setData({
        resultText: result.bodyText || result.resultText || text,
        formatting: false
      });
    }).catch((error) => {
      this.setData({ formatting: false });
      wx.showToast({ title: error.message || 'AI整理暂时不可用', icon: 'none' });
    });
  },

  confirmResult() {
    const text = this.data.resultText.trim();
    if (!text) {
      wx.showToast({ title: '暂无可用内容', icon: 'none' });
      return;
    }
    draftService.saveDraft(text, 'ocr');
    wx.navigateTo({ url: '/pages/transfer/editor?source=ocr' });
  },

  goSmartEdit() {
    const text = this.data.resultText.trim();
    if (!text || this.data.formatting) return;
    const that = this;
    quickActionsService.listQuickActions()
      .then(function (result) {
        var actions = result.quickActions || [];
        if (!actions.length) {
          wx.showToast({ title: '暂无可用的整理任务', icon: 'none' });
          return;
        }
        var titles = actions.map(function (a) { return a.title; });
        titles.push('取消');
        wx.showActionSheet({
          itemList: titles.slice(0, -1),
          success: function (res) {
            var selected = actions[res.tapIndex];
            if (!selected) return;
            that.setData({ formatting: true });
            aiAssistant.generateContent({
              text: text,
              type: 'content_polish',
              actionId: selected.id
            }).then(function (aiResult) {
              that.setData({
                resultText: aiResult.bodyText || aiResult.resultText || text,
                formatting: false
              });
            }).catch(function (error) {
              that.setData({ formatting: false });
              wx.showToast({ title: error.message || 'AI整理暂时不可用', icon: 'none' });
            });
          }
        });
      })
      .catch(function () {
        wx.showToast({ title: '加载任务列表失败', icon: 'none' });
      });
  }
});
