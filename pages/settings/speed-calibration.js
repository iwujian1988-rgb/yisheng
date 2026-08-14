const transferSettings = require('../../services/settings/transfer-settings');

Page({
  data: {
    result: ''
  },

  startCalibration() {
    const settings = transferSettings.saveTransferSettings({
      speedMode: 'safe'
    });
    if (settings.locked) {
      this.setData({ result: '当前正在发送，请在发送完成后再校准速度。' });
      wx.showToast({ title: '发送完成后再调整速度', icon: 'none' });
      return;
    }
    this.setData({
      result: '已切换到安全档。请回到首页用短文本测试传输稳定性。'
    });
    wx.showToast({ title: settings.speedMode === 'safe' ? '已保存' : '已更新', icon: 'success' });
  }
});
