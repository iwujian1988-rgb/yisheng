Page({
  data: { messages: [] },

  onLoad() {
    const messages = wx.getStorageSync('customerMessages');
    this.setData({ messages: Array.isArray(messages) ? messages : [] });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    const message = this.data.messages.find((item) => item.id === id) || {};
    wx.showModal({
      title: message.title || '消息详情',
      content: message.content || '暂无详情内容',
      showCancel: false
    });
  }
});
