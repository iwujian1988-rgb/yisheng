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
    speedModeText: ''
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

  ensureDeviceReady() {
    if (this.data.connected) return true;
    wx.showModal({
      title: '先连接设备',
      content: '使用该功能前需要先连接蓝牙设备。',
      confirmText: '去连接',
      cancelText: '稍后',
      success: (res) => {
        if (res.confirm) this.goConnect();
      }
    });
    return false;
  },

  goOcr() {
    if (!this.ensureDeviceReady()) return;
    if (!featureEntitlements.guardAiFeature('ocr', '图片识别')) return;
    wx.navigateTo({ url: '/pages/ocr/index' });
  },

  goAsr() {
    if (!this.ensureDeviceReady()) return;
    if (!featureEntitlements.guardAiFeature('asr', '语音转写')) return;
    wx.navigateTo({ url: '/pages/asr/index' });
  },

  openHelp() {
    const banner = this.data.banner;
    if (banner && banner.url) {
      this.openBanner();
      return;
    }
    wx.navigateTo({ url: '/pages/tutorials/index' });
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
