const devTools = require('../../services/dev/tools');

Page({
  goToTestAccount() {
    const guide = devTools.getTestAccountGuide();
    const content = guide.users
      .map((user) => [
        user.account,
        user.password,
        user.purchaseStatus + '/' + user.deviceBindingStatus
      ].join('  '))
      .join('\n');

    wx.showModal({
      title: '测试账号',
      content: '验证码：' + guide.verificationCode + '\n' + content,
      showCancel: false
    });
  },

  goToTestStatus() {
    const status = devTools.getTestStatus();
    wx.showModal({
      title: '当前测试状态',
      content: [
        '登录：' + (status.hasToken ? '是' : '否'),
        '账号：' + status.accountStatus,
        '购买：' + status.purchaseStatus,
        '设备：' + status.deviceBindingStatus,
        '服务：' + status.serviceStatus
      ].join('\n'),
      showCancel: false
    });
  },

  clearTestData() {
    wx.showModal({
      title: '确认清理',
      content: '将清除测试记录、草稿、设置和调试数据，不清除正式后端数据。',
      confirmText: '清理',
      confirmColor: '#F5222D',
      success: (res) => {
        if (res.confirm) {
          devTools.clearTestData();
          wx.showToast({ title: '已清理', icon: 'success' });
        }
      }
    });
  }
});
