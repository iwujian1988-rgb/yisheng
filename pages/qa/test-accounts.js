const devTools = require('../../services/dev/tools');

Page({
  viewAccounts() {
    const guide = devTools.getTestAccountGuide();
    wx.showModal({
      title: '测试账号',
      content: '验证码：' + guide.verificationCode + '\n账号信息请仅用于开发测试。',
      showCancel: false
    });
  }
});
