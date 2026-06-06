Page({
  data: {
    types: [
      { value: 'organize', label: '整理文本', desc: '梳理文本结构和逻辑' },
      { value: 'polish', label: '润色表达', desc: '优化文字表达和用语' },
      { value: 'summary', label: '生成摘要', desc: '提取核心内容生成摘要' },
      { value: 'proofread', label: '术语校对', desc: '检查专业术语的准确性' },
      { value: 'format', label: '格式规范', desc: '按标准格式整理文本' }
    ],
    selectedType: ''
  },

  onTypeChange(e) {
    this.setData({ selectedType: e.detail.value });
  },

  continueNext() {
    if (!this.data.selectedType) {
      return;
    }
    wx.navigateTo({
      url: '/pages/ai/detail?type=' + encodeURIComponent(this.data.selectedType)
    });
  }
});
