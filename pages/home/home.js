const authGuard = require('../../services/auth/guard');
const authSession = require('../../services/auth/session');
const featureEntitlements = require('../../services/entitlements/features');
const bannerConfig = require('../../services/content/banner');
const draftService = require('../../services/content/draft');
const vucEncoder = require('../../utils/encoder/vuc');
const bleLink = require('../../services/device/ble-link');
const bleTransferBehavior = require('../../behaviors/ble-transfer');
const tabBarNav = require('../../services/navigation/tab-bar');
const transferSettings = require('../../services/settings/transfer-settings');
const localHistory = require('../../services/transfer/local-history');
const transferDemo = require('../../services/device/transfer-demo');

const GUIDE_POSTER_SEEN_KEY = 'homeGuidePosterSeenV1';

Page({
  behaviors: [bleTransferBehavior],

  data: {
    banner: null,
    inputText: '',
    canSend: false,
    isFullscreen: false,
    showGuidePoster: false,
    greeting: '',
    greetingNote: '',
    stayOnPageAfterSend: true,
    textareaAutosize: { minHeight: 200 },
    statusTitle: '设备已连接',
    statusDesc: '蓝牙已就绪，可直接发送',
    speedModeText: '',
    isMember: false,
    memberExpiry: ''
  },

  cancelSend: false,
  writeCharacteristic: null,
  notifyCharacteristic: null,
  bluetoothInited: false,
  reconnecting: false,
  closeBluetoothOnDetach: false,
  manualDisconnect: false,

  onBleDisconnected() {
    this.manualDisconnect = true;
    wx.showToast({ title: '已断开连接', icon: 'success' });
    this.refreshDeviceStatus();
  },

  onLoad() {
    this.setData({ banner: bannerConfig.getHomeBanner() });
    this.refreshSpeedMode();
    this.refreshGreeting();
    this.greetingTimer = setInterval(() => this.refreshGreeting(), 60 * 1000);
  },

  onUnload() {
    if (this.greetingTimer) clearInterval(this.greetingTimer);
  },

  onShow() {
    tabBarNav.syncTabBar(this, 'pages/home/home');
    if (!authGuard.requireActiveAccount()) return;
    authSession.refreshCurrentSession().catch(() => null);
    this.refreshSpeedMode();
    this.refreshGreeting();
    this.refreshDeviceStatus();
    this.refreshMemberStatus();
    this.resumePendingBleConnection();
    this.showGuidePosterOnce();
    const draft = draftService.consumeDraft();
    if (draft && draft.text) {
      this.updateInputText(draft.text);
    }
  },

  refreshMemberStatus() {
    const summary = authSession.getStoredSessionSummary();
    const isMember = summary.purchaseStatus === 'paid' || (summary.user && summary.user.memberStatus === 'active');
    const memberExpiry = summary.user && summary.user.memberEnd ? String(summary.user.memberEnd).slice(0, 10) : '';
    this.setData({ isMember, memberExpiry });
  },

  refreshGreeting() {
    const hour = new Date().getHours();
    let period = '晚上好';
    let note = '工作是做不完的！记得开心';
    if (hour >= 5 && hour < 8) {
      period = '早上好';
      note = '新的一天，从容开始！';
    } else if (hour >= 8 && hour < 12) {
      period = '上午好';
      note = '今天也要顺顺利利！';
    } else if (hour >= 12 && hour < 14) {
      period = '中午好';
      note = '午饭要按时吃！';
    } else if (hour >= 14 && hour < 18) {
      period = '下午好';
      note = '记得早点下班！';
    } else if (hour < 5) {
      period = '夜深了';
      note = '别太晚，注意休息！';
    }
    this.setData({ greeting: '主任，' + period + '！', greetingNote: note });
  },

  resumePendingBleConnection() {
    const pendingDeviceId = wx.getStorageSync('pendingBleConnect');
    if (this.data.connected || this.reconnecting) return;
    if (pendingDeviceId) wx.removeStorageSync('pendingBleConnect');
    if (!pendingDeviceId && !bleLink.shouldAutoReconnect()) return;
    this.manualDisconnect = false;
    this.tryReconnectBoundDevice();
  },

  updateInputText(inputText) {
    this.setData({
      inputText: inputText || '',
      canSend: Boolean(String(inputText || '').trim())
    });
  },

  refreshDeviceStatus() {
    const connected = bleLink.isBleLinkReady();
    const deviceId = connected ? bleLink.getStoredBleDeviceId() : '';
    this.setData({
      connected,
      deviceId,
      statusTitle: connected ? '设备已连接' : '尚未连接设备',
      statusDesc: connected ? '蓝牙已就绪，可直接发送' : ''
    });
  },

  refreshSpeedMode() {
    const summary = transferSettings.getSpeedModeSummary();
    this.setData({ speedModeText: summary.text });
  },

  goTransferSettings() {
    wx.navigateTo({ url: '/pages/settings/transfer' });
  },

  goConnect() {
    this.manualDisconnect = false;
    wx.navigateTo({ url: '/pages/bluetooth/index' });
  },

  onConnectTap() {
    if (transferDemo.isActive()) {
      wx.showToast({ title: '演示设备已连接', icon: 'none' });
      return;
    }
    if (this.data.connected) {
      if (!this.data.deviceId) {
        this.setData({ deviceId: bleLink.getStoredBleDeviceId() || '' });
      }
      this.disconnect();
      return;
    }
    this.goConnect();
  },

  onTextInput(e) {
    this.updateInputText(e.detail.value || '');
  },

  onClearTap() {
    this.updateInputText('');
  },

  openFullscreen() {
    this.setData({ isFullscreen: true });
  },

  closeFullscreen() {
    this.setData({ isFullscreen: false });
  },

  openGuidePoster() {
    this.setData({ showGuidePoster: true });
  },

  showGuidePosterOnce() {
    if (wx.getStorageSync(GUIDE_POSTER_SEEN_KEY)) return;
    wx.setStorageSync(GUIDE_POSTER_SEEN_KEY, true);
    this.openGuidePoster();
  },

  closeGuidePoster() {
    this.setData({ showGuidePoster: false });
  },

  stopGuidePoster() {},

  openGuideH5() {
    this.closeGuidePoster();
    wx.navigateTo({
      url: '/pages/common/webview?title=' + encodeURIComponent('小科打字猿使用指南') +
        '&url=' + encodeURIComponent('https://api.maxnote.me/guide')
    });
  },

  onSendTap() {
    if (!this.data.connected) {
      this.goConnect();
      return;
    }
    const text = String(this.data.inputText || '').trim();
    if (!text || this.data.sending) return;
    if (!featureEntitlements.guardTransferFeature('发送到电脑')) return;
    const tokens = vucEncoder.textToTokens(text);
    this.sendTokens(tokens, text, 'manual');
  },

  onTransferComplete(text, source) {
    if (text) {
      localHistory.addRecord(text, source || 'manual');
    }
  },

  goHistory() {
    wx.navigateTo({ url: '/pages/transfer/history' });
  },

  goPhrases() {
    wx.navigateTo({ url: '/pages/transfer/phrases' });
  },

  goSnippets() {
    wx.navigateTo({ url: '/pages/transfer/snippets' });
  },

  goAiAssistant() {
    featureEntitlements.guardAiFeature('aiAssistant', 'AI 助手').then((ok) => {
      if (!ok) return;
      wx.navigateTo({ url: '/pages/ai-assistant/index' });
    });
  },

  goAiText() {
    featureEntitlements.guardAiFeature('aiWriting', 'AI 智能整理').then((ok) => {
      if (!ok) return;
      wx.switchTab({ url: '/pages/ai/detail' });
    });
  },

  goAiTemplate() {
    featureEntitlements.guardAiFeature('templates', 'AI 模板生成').then((ok) => {
      if (!ok) return;
      wx.switchTab({ url: '/pages/templates/index' });
    });
  },

  goOcr() {
    featureEntitlements.guardAiFeature('ocr', '图片识别').then((ok) => {
      if (!ok) return;
      wx.navigateTo({ url: '/pages/ocr/index' });
    });
  },

  goAsr() {
    featureEntitlements.guardAiFeature('asr', '语音转写').then((ok) => {
      if (!ok) return;
      wx.navigateTo({ url: '/pages/asr/index' });
    });
  },

  openBanner() {
    const banner = this.data.banner;
    if (!banner || !banner.url) return;
    wx.navigateTo({
      url: '/pages/common/webview?title=' + encodeURIComponent(banner.title || '详情') +
        '&url=' + encodeURIComponent(banner.url)
    });
  }
});
