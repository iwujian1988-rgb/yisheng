Page({
  contactSales() {
    wx.navigateTo({
      url: '/pages/support/index',
      fail() {
        wx.showToast({ title: '请到帮助页联系销售', icon: 'none' });
      }
    });
  },

  claimPurchasedMembership() {
    wx.navigateTo({ url: '/pages/purchase/claim' });
  }
});
