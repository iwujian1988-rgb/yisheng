Page({
  data: {
    checks: []
  },

  startCheck() {
    wx.showToast({ title: '等待接入后端检查服务', icon: 'none' });
  }
});
