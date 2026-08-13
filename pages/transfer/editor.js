const vucEncoder = require('../../utils/encoder/vuc');
const draftService = require('../../services/content/draft');
const featureEntitlements = require('../../services/entitlements/features');
const bleTransferBehavior = require('../../behaviors/ble-transfer');

const SOURCE_LABELS = {
  manual: '直接编辑',
  template: '场景模板',
  ai: '智能润色',
  ocr: '图片取字',
  asr: '语音成稿'
};

Page({
  behaviors: [bleTransferBehavior],

  data: {
    inputText: '',
    draftSource: 'manual',
    sourceLabel: '直接编辑',
    inputFocus: false,
    stayOnPageAfterSend: false
  },

  cancelSend: false,
  writeCharacteristic: null,
  notifyCharacteristic: null,
  bluetoothInited: false,
  reconnecting: false,
  closeBluetoothOnDetach: true,

  onLoad(options) {
    const source = options && options.source ? decodeURIComponent(options.source) : 'manual';
    const text = options && options.text ? decodeURIComponent(options.text) : '';
    const draft = draftService.consumeDraft();
    const nextText = text || (draft && draft.text) || '';
    const nextSource = source || (draft && draft.source) || 'manual';

    this.setData({
      inputText: nextText,
      draftSource: nextSource,
      sourceLabel: SOURCE_LABELS[nextSource] || '发送内容',
      inputFocus: !nextText
    });
  },

  onUnload() {
    this.closeBluetooth();
  },

  onConnectTap() {
    if (this.data.connected) {
      this.disconnect();
      return;
    }
    this.initBluetooth(() => this.startSearch());
  },

  onTextInput(e) {
    this.setData({ inputText: e.detail.value || '' });
  },

  onClearTap() {
    this.setData({ inputText: '', draftSource: 'manual', sourceLabel: '直接编辑' });
  },

  onSendTap() {
    const text = String(this.data.inputText || '').trim();
    if (!this.data.connected || !text || this.data.sending) return;
    if (!featureEntitlements.guardTransferFeature('发送到电脑')) return;
    const tokens = vucEncoder.textToTokens(text);
    this.sendTokens(tokens, text, this.data.draftSource);
  },

  onCancelTap() {
    this.onCancelSendTap();
  }
});
