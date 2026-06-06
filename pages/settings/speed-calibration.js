const transferSettings = require('../../services/settings/transfer-settings');

Page({
  data: {
    result: ''
  },

  startCalibration() {
    const settings = transferSettings.saveTransferSettings({
      speedMode: 'safe'
    });
    this.setData({
      result: '已切换到安全档。请回到首页用短文本测试传输稳定性。'
    });
    wx.showToast({ title: settings.speedMode === 'safe' ? '已保存' : '已更新', icon: 'success' });
  }
});
