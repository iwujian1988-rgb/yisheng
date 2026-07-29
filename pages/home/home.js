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
const reviewerMock = require('../../services/dev/reviewer-mock');

Page({
  behaviors: [bleTransferBehavior],

  data: {
    banner: null,
    inputText: '',
    canSend: false,
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
  },

  onShow() {
    tabBarNav.syncTabBar(this, 'pages/home/home');
    if (!authGuard.requireActiveAccount()) return;
    authSession.refreshCurrentSession().catch(() => null);
    this.refreshSpeedMode();
    this.refreshDeviceStatus();
    this.refreshMemberStatus();
    const draft = draftService.consumeDraft();
    if (draft && draft.text) {
      this.updateInputText(draft.text);
    }
    if (this.data.connected) {
      this.manualDisconnect = false;
    }
    if (!this.manualDisconnect && !this.data.connected && !this.reconnecting) {
      this.tryReconnectBoundDevice();
    }
  },

  refreshMemberStatus() {
    const summary = authSession.getStoredSessionSummary();
    const isMember = summary.purchaseStatus === 'paid' || (summary.user && summary.user.memberStatus === 'active');
    const memberExpiry = summary.user && summary.user.memberEnd ? String(summary.user.memberEnd).slice(0, 10) : '';
    this.setData({ isMember, memberExpiry });
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
    if (reviewerMock.isMockBleMode()) {
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
