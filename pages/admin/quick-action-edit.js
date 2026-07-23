const quickActions = require('../../services/admin/quick-actions');

Page({
  data: {
    id: '',
    actionCode: '',
    title: '',
    description: '',
    category: '',
    audience: 'general',
    placeholder: '',
    promptContent: '',
    status: 'published',
    canSave: false,
    saving: false,
    isEdit: false
  },

  onLoad(options) {
    const id = options.id ? decodeURIComponent(options.id) : '';
    if (!id) {
      this.setData({ isEdit: false });
      return;
    }
    this.setData({ id, isEdit: true, loading: true });
    quickActions.listQuickActions('')
      .then((list) => list.find((item) => item.id === id))
      .then((item) => {
        if (!item) {
          this.setData({ loading: false });
          return;
        }
        this.setData({
          actionCode: item.actionCode || '',
          title: item.title || '',
          description: item.description || '',
          category: item.category || '',
          audience: item.audience === 'professional' ? 'professional' : 'general',
          placeholder: item.placeholder || '',
          promptContent: item.promptContent || '',
          status: item.status || 'published',
          loading: false
        }, this.checkCanSave);
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
      canSave: Boolean(this.data.title && (this.data.isEdit || this.data.actionCode))
    });
  },

  save() {
    if (!this.data.canSave || this.data.saving) return;
    this.setData({ saving: true });
    const payload = {
      title: this.data.title,
      description: this.data.description,
      category: this.data.category,
      audience: this.data.audience,
      placeholder: this.data.placeholder,
      promptContent: this.data.promptContent,
      status: this.data.status
    };
    const op = this.data.isEdit
      ? quickActions.updateQuickAction(this.data.id, payload)
      : quickActions.createQuickAction(Object.assign({ actionCode: this.data.actionCode }, payload));
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
