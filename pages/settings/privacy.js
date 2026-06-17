const privacySettings = require('../../services/settings/privacy-settings');
const localData = require('../../services/storage/local-data');

Page({
  data: {},

  goToAiRedaction() {
    wx.navigateTo({
      url: '/pages/common/agreement?type=privacyPolicy'
    });
  },

  clearLocalData() {
    wx.showModal({
      title: '确认清除',
      content: '清除后，本设备上的草稿和旧版历史缓存将无法恢复。',
      confirmText: '清除',
      confirmColor: '#F5222D',
      success: (res) => {
        if (res.confirm) {
          localData.clearLocalContentData();
          wx.showToast({ title: '已清除', icon: 'success' });
        }
      }
    });
  }
});
