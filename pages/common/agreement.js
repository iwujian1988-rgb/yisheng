// pages/common/agreement.js
Page({
  data: {
    type: 'userAgreement',
    companyName: '杭州光刻创能科技有限公司',
    contactEmail: 'imwujianfei@163.com',
    serviceWechat: 'imwujianfei'
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
