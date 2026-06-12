const ocrRecognizer = require('../../services/ocr/recognizer');
const aiAssistant = require('../../services/ai/assistant');
const draftService = require('../../services/content/draft');
const featureEntitlements = require('../../services/entitlements/features');
const quickActionsService = require('../../services/ai/quick-actions');

const AI_MEDIA_INPUT_DRAFT_KEY = 'aiMediaInputDraft';

function selectActions(actions) {
  return (actions || [])
    .filter((action) => action)
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
    .slice(0, 6);
}

Page({
  data: {
    imageUrl: '',
    resultText: '',
    resultMeta: null,
    recognizing: false,
    formatting: false,
    errorMessage: '',
    returnToAi: false
  },

  onLoad(options) {
    if (!featureEntitlements.guardAiFeature('ocr', '图片识别')) {
      wx.navigateBack({
        delta: 1,
        fail: () => wx.reLaunch({ url: '/pages/home/home' })
      });
      return;
    }

    this.setData({ returnToAi: Boolean(options && options.returnTo === 'ai') });
    if (options && options.auto === '1') {
      setTimeout(() => this.chooseImage(), 300);
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
      },
      fail: (err) => {
        this.setData({
          errorMessage: err && err.errMsg ? err.errMsg : '没有选择图片'
        });
        wx.showToast({ title: '没有选择图片', icon: 'none' });
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
          errorMessage: error && error.message ? error.message : '图片识别暂时不可用，请稍后重试'
        });
      });
  },

  updateResultText(e) {
    this.setData({ resultText: e.detail.value || '' });
  },

  confirmResult() {
    const text = String(this.data.resultText || '').trim();
    if (!text) {
      wx.showToast({ title: '暂无可用内容', icon: 'none' });
      return;
    }

    if (this.data.returnToAi) {
      wx.setStorageSync(AI_MEDIA_INPUT_DRAFT_KEY, {
        text,
        source: 'ocr',
        updatedAt: new Date().toISOString()
      });
      wx.navigateBack({ delta: 1 });
      return;
    }

    draftService.saveDraft(text, 'ocr');
    wx.navigateTo({ url: '/pages/transfer/editor?source=ocr' });
  },

  goSmartEdit() {
    if (this.data.returnToAi) return;

    const text = String(this.data.resultText || '').trim();
    if (!text || this.data.formatting) return;

    quickActionsService.listQuickActions()
      .then((result) => {
        const actions = selectActions(result.quickActions);
        if (!actions.length) {
          wx.showToast({ title: '暂无可用的专业整理', icon: 'none' });
          return;
        }

        wx.showActionSheet({
          itemList: actions.map((action) => action.title),
          success: (res) => {
            const selected = actions[res.tapIndex];
            if (!selected) return;

            this.setData({ formatting: true });
            aiAssistant.generateContent({
              text,
              type: 'content_polish',
              actionId: selected.id
            }).then((aiResult) => {
              this.setData({
                resultText: aiResult.bodyText || aiResult.resultText || text,
                formatting: false
              });
            }).catch((error) => {
              this.setData({ formatting: false });
              wx.showToast({ title: error.message || '专业整理暂时不可用', icon: 'none' });
            });
          }
        });
      })
      .catch(() => {
        wx.showToast({ title: '加载整理能力失败', icon: 'none' });
      });
  }
});
