const aiAssistant = require('../../services/ai/assistant');
const templateCatalog = require('../../services/templates/catalog');
const templateRenderer = require('../../services/templates/renderer');

Page({
  data: {
    template: null,
    title: '',
    description: '',
    fields: [],
    canGenerate: false,
    isGenerating: false
  },

  onLoad(options) {
    if (options.template) {
      const template = this.parseTemplate(options.template);
      this.applyTemplate(template);
      return;
    }

    const legacyTemplate = {
      name: options.title ? decodeURIComponent(options.title) : '',
      description: options.description ? decodeURIComponent(options.description) : '',
      variableDefs: options.fields ? this.parseFields(options.fields) : []
    };
    this.applyTemplate(legacyTemplate);
  },

  parseTemplate(value) {
    try {
      return JSON.parse(decodeURIComponent(value));
    } catch (e) {
      return {};
    }
  },

  parseFields(fieldsOption) {
    try {
      const fields = JSON.parse(decodeURIComponent(fieldsOption));
      return Array.isArray(fields) ? fields : [];
    } catch (e) {
      return [];
    }
  },

  applyTemplate(template) {
    const fields = (template.variableDefs || template.fields || []).map((field) => {
      return Object.assign({}, field, { value: field.value || '' });
    });
    this.setData({
      template,
      title: template.name || template.title || '',
      description: template.description || '',
      fields,
      canGenerate: this.canGenerate(fields)
    });
  },

  canGenerate(fields) {
    const requiredFields = (fields || []).filter((field) => field.required);
    if (!requiredFields.length) {
      return (fields || []).some((field) => String(field.value || '').trim().length > 0);
    }
    return requiredFields.every((field) => String(field.value || '').trim().length > 0);
  },

  onFieldInput(e) {
    const key = e.currentTarget.dataset.key;
    const value = e.detail.value;
    const fields = this.data.fields.map((field) => {
      if (field.key !== key) return field;
      return Object.assign({}, field, { value });
    });

    this.setData({
      fields,
      canGenerate: this.canGenerate(fields)
    });
  },

  generateResult() {
    if (!this.data.canGenerate || this.data.isGenerating) {
      wx.showToast({ title: '请先填写必填内容', icon: 'none' });
      return;
    }

    const rawText = templateRenderer.renderTemplateFields(this.data.title, this.data.fields);
    this.setData({ isGenerating: true });

    templateCatalog.generateTemplate(this.data.template || {}, this.data.fields)
      .catch(() => {
        return aiAssistant.generateTemplateContent({
          template: this.data.template || {},
          text: rawText
        });
      })
      .then((result) => {
        const bodyText = result.bodyText || result.resultText || rawText;
        templateRenderer.saveTemplateResult({
          bodyText,
          resultText: result.resultText || bodyText,
          confirmText: result.confirmText || templateRenderer.buildConfirmText(this.data.fields),
          rawText: result.rawText || result.resultText || bodyText,
          provider: result.provider || 'template-engine',
          source: 'template'
        });
        wx.navigateTo({ url: '/pages/templates/result' });
      })
      .catch((err) => {
        wx.showToast({ title: err.message || '模板生成失败', icon: 'none' });
      })
      .finally(() => {
        this.setData({ isGenerating: false });
      });
  }
});
