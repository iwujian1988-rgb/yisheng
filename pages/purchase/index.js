Page({
  contactSales() {
    wx.navigateTo({
      url: '/pages/support/index',
      fail() {
        wx.showToast({ title: '等待接入客服服务', icon: 'none' });
      }
    });
  },

  inputActivationCode() {
    wx.navigateTo({ url: '/pages/purchase/activate' });
  }
});
