const authGuard = require('../../services/auth/guard');
const historyRecords = require('../../services/history/records');
const featureEntitlements = require('../../services/entitlements/features');
const bannerConfig = require('../../services/content/banner');

Page({
  data: {
    connected: false,
    statusText: '未连接',
    bluetoothBypass: false,
    banner: null,
    recentRecords: [],
    loadingRecords: false
  },

  onLoad() {
    this.refreshDeviceStatus();
    this.setData({ banner: bannerConfig.getHomeBanner() });
  },

  onShow() {
    if (!authGuard.requireActiveAccount()) return;
    this.refreshDeviceStatus();
    this.loadRecentRecords();
  },

  refreshDeviceStatus() {
    const app = typeof getApp === 'function' ? getApp() : null;
    const globalData = app && app.globalData ? app.globalData : {};
    const bluetoothBypass = Boolean(globalData.skipBluetoothForDev || wx.getStorageSync('skipBluetoothForDev'));
    const connected = Boolean(bluetoothBypass || globalData.deviceConnected);
    this.setData({
      bluetoothBypass,
      connected,
      statusText: bluetoothBypass ? '本地测试' : (connected ? '已连接' : '未连接')
    });
  },

  loadRecentRecords() {
    this.setData({ loadingRecords: true });
    historyRecords.getHistoryRecords()
      .then((records) => {
        this.setData({
          recentRecords: (records || []).slice(0, 3),
          loadingRecords: false
        });
      })
      .catch(() => {
        this.setData({ loadingRecords: false, recentRecords: [] });
      });
  },

  onConnectTap() {
    wx.navigateTo({ url: '/pages/bluetooth/index' });
  },

  goManualInput() {
    wx.navigateTo({ url: '/pages/transfer/editor?source=manual' });
  },

  goTemplates() {
    wx.navigateTo({ url: '/pages/templates/index' });
  },

  ensureDeviceReady() {
    if (this.data.connected) return true;
    wx.showModal({
      title: '先连接设备',
      content: '除直接编辑外，其余能力需要连接设备后使用。',
      confirmText: '去连接',
      cancelText: '稍后',
      success(res) {
        if (res.confirm) wx.navigateTo({ url: '/pages/bluetooth/index' });
      }
    });
    return false;
  },

  goAi() {
    if (!featureEntitlements.guardAiFeature('aiWriting', '智能创作')) return;
    wx.switchTab({ url: '/pages/ai/detail' });
  },

  goOcr() {
    if (!featureEntitlements.guardAiFeature('ocr', '图片识别')) return;
    wx.navigateTo({ url: '/pages/ocr/index' });
  },

  goAsr() {
    if (!featureEntitlements.guardAiFeature('asr', '语音转写')) return;
    wx.navigateTo({ url: '/pages/asr/index' });
  },

  openBanner() {
    const banner = this.data.banner;
    if (!banner || !banner.url) return;
    wx.navigateTo({
      url: '/pages/common/webview?title=' + encodeURIComponent(banner.title || '详情') +
        '&url=' + encodeURIComponent(banner.url)
    });
  },

  openHistoryRecord(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: '/pages/history/detail?id=' + encodeURIComponent(id) });
  },

  goHistory() {
    wx.navigateTo({ url: '/pages/history/history' });
  }
});
