const authGuard = require('../../services/auth/guard');
const authSession = require('../../services/auth/session');
const deviceSession = require('../../services/device/session');
const ocrRecognizer = require('../../services/ocr/recognizer');
const draftService = require('../../services/content/draft');
const featureEntitlements = require('../../services/entitlements/features');
const imagePipeline = require('../../services/ocr/image-pipeline');

function buildLinesFromResult(result) {
  var rawLines = result && Array.isArray(result.lines) ? result.lines : [];
  if (rawLines.length) {
    return rawLines.map(function (item, index) {
      return {
        index: item.index != null ? item.index : index,
        text: item.text || '',
        field: item.field || '',
        checked: true
      };
    }).filter(function (item) { return item.text; });
  }

  var text = result && result.text ? String(result.text).trim() : '';
  if (!text) return [];

  return text.split('\n')
    .map(function (line) { return line.trim(); })
    .filter(Boolean)
    .map(function (line, index) {
      return { index: index, text: line, field: '', checked: true };
    });
}

function countSelected(lines) {
  return (lines || []).filter(function (line) { return line.checked; }).length;
}

function syncSelectionState(lines) {
  var selectedCount = countSelected(lines);
  return {
    lines: lines,
    selectedCount: selectedCount,
    allSelected: selectedCount === lines.length && lines.length > 0,
    canConfirm: selectedCount > 0
  };
}

Page({
  data: {
    imageUrl: '',
    lines: [],
    selectedCount: 0,
    allSelected: false,
    canConfirm: false,
    resultMeta: null,
    recognizing: false,
    errorMessage: '',
    hasResult: false
  },

  onLoad() {
    if (!authGuard.requireActiveAccount()) return;
    featureEntitlements.guardAiFeature('ocr', '图片识别').then(function (ok) {
      if (!ok) {
        wx.navigateBack({
          delta: 1,
          fail: () => wx.reLaunch({ url: '/pages/home/home' })
        });
      }
    });
  },

  onShow() {
    authSession.refreshCurrentSession().catch(() => null);
    deviceSession.ensureActiveSession().catch(() => null);
  },

  resetResultState() {
    this.setData({
      lines: [],
      selectedCount: 0,
      allSelected: false,
      canConfirm: false,
      resultMeta: null,
      errorMessage: '',
      hasResult: false
    });
  },

  chooseImage() {
    if (this.data.recognizing) return;

    imagePipeline.pickCropAndPrepare()
      .then((imageUrl) => {
        this.setData({ imageUrl: imageUrl });
        this.resetResultState();
        return this.recognizeSelectedImage(imageUrl);
      })
      .catch((error) => {
        if (!error || error.code === 'PICK_CANCELLED' || error.code === 'CROP_CANCELLED') {
          return;
        }
        var message = error && error.message ? error.message : '图片处理失败，请重试';
        this.setData({ errorMessage: message });
        wx.showToast({ title: message, icon: 'none' });
      });
  },

  recognizeSelectedImage(imageUrl) {
    if (!imageUrl) {
      wx.showToast({ title: '请先选择图片', icon: 'none' });
      return Promise.resolve();
    }

    this.setData({ recognizing: true, errorMessage: '' });
    wx.showLoading({ title: '正在识别...', mask: true });

    return deviceSession.ensureActiveSession()
      .catch(() => null)
      .then(() => ocrRecognizer.recognizeImage({ path: imageUrl }))
      .then((result) => {
        var lines = buildLinesFromResult(result);
        if (!lines.length) {
          this.setData({
            recognizing: false,
            errorMessage: '未识别到文字，请重新拍摄或调整裁剪范围',
            canConfirm: false
          });
          wx.showToast({ title: '未识别到文字', icon: 'none' });
          return;
        }

        this.setData(Object.assign({
          resultMeta: result ? {
            provider: result.provider || result.engine || '',
            engine: result.engine || result.provider || '',
            status: result.status || 'ok',
            confidence: result.confidence || 0,
            elapsedMs: result.elapsedMs || 0,
            imageBytes: result.imageBytes || 0,
            charCount: result.charCount || (result.text ? result.text.length : 0)
          } : null,
          recognizing: false,
          errorMessage: '',
          hasResult: true
        }, syncSelectionState(lines)));
      })
      .catch((error) => {
        this.setData({
          recognizing: false,
          errorMessage: error && error.message ? error.message : '图片识别暂时不可用，请稍后重试',
          canConfirm: false
        });
        wx.showToast({
          title: error && error.message ? error.message : '识别失败',
          icon: 'none'
        });
      })
      .finally(() => {
        wx.hideLoading();
      });
  },

  onLineCheckChange(e) {
    var index = Number(e.currentTarget.dataset.index);
    var lines = (this.data.lines || []).slice();
    if (!lines[index]) return;
    lines[index] = Object.assign({}, lines[index], { checked: Boolean(e.detail.checked) });
    this.setData(syncSelectionState(lines));
  },

  onToggleSelectAll() {
    if (!this.data.lines.length) return;
    var allSelected = this.data.allSelected;
    var lines = this.data.lines.map(function (line) {
      return Object.assign({}, line, { checked: !allSelected });
    });
    this.setData(syncSelectionState(lines));
  },

  getSelectedTexts() {
    return (this.data.lines || [])
      .filter(function (line) { return line.checked; })
      .map(function (line) { return line.text; });
  },

  confirmResult() {
    var text = this.getSelectedTexts().join('\n').trim();
    if (!text) {
      wx.showToast({ title: '请至少选择一行', icon: 'none' });
      return;
    }

    draftService.saveDraft(text, 'ocr');
    wx.navigateBack({
      delta: 1,
      fail: function () {
        wx.switchTab({ url: '/pages/home/home' });
      }
    });
  }
});
