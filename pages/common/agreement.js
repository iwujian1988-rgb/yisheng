// pages/common/agreement.js
Page({
  data: {
    type: 'userAgreement'
  },

  onLoad(options) {
    const titleMap = {
      userAgreement: '用户协议',
      privacyPolicy: '隐私政策'
    };
    this.setData({ type: options.type || 'userAgreement' });
    wx.setNavigationBarTitle({ title: titleMap[this.data.type] || '协议' });
  }
});
