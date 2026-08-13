const orderEntitlement = require('../../services/purchase/order-entitlement');

Page({
  data: { isLoading: false, resultText: '' },

  onGetPhoneNumber(event) {
    const phoneCode = event.detail && event.detail.code;
    if (!phoneCode || this.data.isLoading) {
      wx.showToast({ title: '需要授权手机号后才能领取', icon: 'none' });
      return;
    }
    this.setData({ isLoading: true, resultText: '' });
    orderEntitlement.claimWithWechatPhone(phoneCode)
      .then((result) => {
        this.setData({ isLoading: false, resultText: '已领取，会员有效期至 ' + String(result.memberEnd || '').slice(0, 10) });
        wx.showToast({ title: '领取成功', icon: 'success' });
      })
      .catch((error) => {
        this.setData({ isLoading: false });
        const message = error && error.code === 'ORDER_ENTITLEMENT_NOT_FOUND'
          ? '该手机号暂未查询到会员记录 请联系客服'
          : (error.message || '暂未匹配到可领取权益');
        wx.showToast({ title: message, icon: 'none', duration: 3000 });
      });
  },

  contactSupport() {
    wx.navigateTo({ url: '/pages/support/index?type=membership_claim' });
  }
});
