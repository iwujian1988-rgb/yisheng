const templates = require('../../services/admin/templates');

Page({
  data: {
    id: '',
    templateCode: '',
    name: '',
    description: '',
    category: '',
    audience: 'general',
    promptContent: '',
    status: 'draft',
    canSave: false,
    saving: false,
    loading: false,
    isEdit: false
  },

  onLoad(options) {
    const id = options.id ? decodeURIComponent(options.id) : '';
    if (!id) {
      this.setData({ isEdit: false });
      return;
    }
    this.setData({ id, isEdit: true, loading: true });
    templates.getTemplateById(id)
      .then((item) => {
        if (!item) {
          this.setData({ loading: false });
          return;
        }
        this.setData({
          templateCode: item.templateCode || '',
          name: item.name || '',
          description: item.description || '',
          category: item.category || '',
          audience: item.audience === 'professional' ? 'professional' : 'general',
          promptContent: item.promptContent || '',
          status: item.status || 'draft',
          loading: false
        }, this.checkCanSave);
      })
      .catch((err) => {
        this.setData({ loading: false });
        wx.showToast({ title: err.message || '加载失败', icon: 'none' });
      });
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value }, this.checkCanSave);
  },

  onAudienceChange(e) {
    this.setData({ audience: e.detail.value }, this.checkCanSave);
  },

  onStatusChange(e) {
    this.setData({ status: e.detail.value }, this.checkCanSave);
  },

  checkCanSave() {
    this.setData({
      canSave: Boolean(this.data.name && (this.data.isEdit || this.data.templateCode))
    });
  },

  save() {
    if (!this.data.canSave || this.data.saving) return;
    this.setData({ saving: true });
    const payload = {
      name: this.data.name,
      description: this.data.description,
      category: this.data.category,
      audience: this.data.audience,
      promptContent: this.data.promptContent,
      status: this.data.status
    };
    const op = this.data.isEdit
      ? templates.updateTemplate(this.data.id, payload)
      : templates.createTemplate(Object.assign({ templateCode: this.data.templateCode }, payload));
    op.then(() => {
      wx.showToast({ title: '已保存', icon: 'success' });
      wx.navigateBack();
    }).catch((err) => {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    }).finally(() => {
      this.setData({ saving: false });
    });
  }
});
