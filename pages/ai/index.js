Page({
  data: {
    conversations: []
  },

  newConversation() {
    wx.navigateTo({ url: '/pages/ai/detail' });
  }
});
