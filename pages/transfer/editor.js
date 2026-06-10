const vucEncoder = require('../../utils/encoder/vuc');
const bleProtocol = require('../../utils/ble/protocol');
const sendProfile = require('../../utils/ble/send-profile');
const draftService = require('../../services/content/draft');
const historyRecords = require('../../services/history/records');

const SOURCE_LABELS = {
  manual: '直接编辑',
  template: '场景模板',
  ai: '智能润色',
  ocr: '图片取字',
  asr: '语音成稿'
};

Page({
  data: {
    connected: false,
    statusText: '未连接',
    deviceId: '',
    inputText: '',
    draftSource: 'manual',
    sourceLabel: '直接编辑',
    sending: false,
    sendProgress: 0,
    bluetoothBypass: false,
    inputFocus: false
  },

  cancelSend: false,
  writeCharacteristic: null,
  notifyCharacteristic: null,
  bluetoothInited: false,

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
    this.applyBluetoothBypass();
  },

  onUnload() {
    this.closeBluetooth();
  },

  isBluetoothBypassEnabled() {
    const app = typeof getApp === 'function' ? getApp() : null;
    return Boolean(
      (app && app.globalData && app.globalData.skipBluetoothForDev) ||
      wx.getStorageSync('skipBluetoothForDev')
    );
  },

  setGlobalDeviceStatus(connected, deviceId) {
    const app = typeof getApp === 'function' ? getApp() : null;
    if (app && app.globalData) {
      app.globalData.deviceConnected = connected;
      app.globalData.deviceId = deviceId || null;
    }
  },

  applyBluetoothBypass() {
    if (!this.isBluetoothBypassEnabled()) {
      this.setData({ bluetoothBypass: false });
      return;
    }

    this.writeCharacteristic = null;
    this.notifyCharacteristic = null;
    this.setGlobalDeviceStatus(true, 'DEV-MOCK');
    this.setData({
      bluetoothBypass: true,
      connected: true,
      statusText: '测试模式：已跳过蓝牙',
      deviceId: 'DEV-MOCK'
    });
  },

  onConnectTap() {
    if (this.data.bluetoothBypass) {
      wx.showToast({ title: '测试模式已跳过蓝牙', icon: 'none' });
      return;
    }

    if (this.data.connected) {
      this.disconnect();
      return;
    }
    this.initBluetooth(() => this.startSearch());
  },

  initBluetooth(callback) {
    if (this.bluetoothInited) {
      callback && callback();
      return;
    }

    wx.openBluetoothAdapter({
      success: () => {
        this.bluetoothInited = true;
        this.setData({ statusText: '已就绪' });
        callback && callback();
      },
      fail: () => {
        wx.showModal({
          title: '请用手机连接设备',
          content: '蓝牙功能需要真机调试，请确认手机蓝牙已开启。',
          showCancel: false
        });
      }
    });
  },

  startSearch() {
    this.setData({ statusText: '搜索中...' });

    wx.startBluetoothDevicesDiscovery({
      allowDuplicatesKey: false,
      success: () => this.onDeviceFound(),
      fail: () => this.setData({ statusText: '搜索失败' })
    });
  },

  onDeviceFound() {
    wx.onBluetoothDeviceFound((res) => {
      const devices = res.devices || [];
      for (let i = 0; i < devices.length; i++) {
        const device = devices[i];
        const name = device.name || device.localName || '';
        if (name.includes('BLE') || name.includes('VUC') || name.includes('HID') || name.includes('舒克')) {
          this.stopSearch();
          this.connectDevice(device.deviceId);
          return;
        }
      }
    });

    setTimeout(() => {
      if (this.data.statusText === '搜索中...') {
        this.stopSearch();
        this.setData({ statusText: '未找到设备' });
      }
    }, 10000);
  },

  stopSearch() {
    wx.stopBluetoothDevicesDiscovery({});
  },

  connectDevice(deviceId) {
    this.setData({ statusText: '连接中...' });
    wx.createBLEConnection({
      deviceId,
      success: () => {
        this.setData({ deviceId });
        this.getServices(deviceId);
      },
      fail: () => this.setData({ statusText: '连接失败' })
    });
  },

  getServices(deviceId) {
    wx.getBLEDeviceServices({
      deviceId,
      success: (res) => {
        const services = res.services || [];
        services.forEach((service) => {
          const uuid = service.uuid.toUpperCase();
          if (uuid.includes('6E400001') || uuid.includes('1800') || uuid.includes('1801')) {
            this.getCharacteristics(deviceId, service.uuid);
          }
        });
      }
    });
  },

  getCharacteristics(deviceId, serviceId) {
    wx.getBLEDeviceCharacteristics({
      deviceId,
      serviceId,
      success: (res) => {
        const chars = res.characteristics || [];
        chars.forEach((char) => {
          const uuid = char.uuid.toUpperCase();
          if (uuid.includes(bleProtocol.WRITE_CHARACTERISTIC_FRAGMENT)) {
            this.writeCharacteristic = Object.assign({}, char, { serviceId });
          }
          if (uuid.includes(bleProtocol.NOTIFY_CHARACTERISTIC_FRAGMENT)) {
            this.notifyCharacteristic = Object.assign({}, char, { serviceId });
            this.startNotify(deviceId, serviceId, char.uuid);
          }
        });

        if (this.writeCharacteristic && !this.data.connected) {
          this.setGlobalDeviceStatus(true, deviceId);
          this.setData({ connected: true, statusText: '已连接' });
          wx.showToast({ title: '连接成功', icon: 'success' });
        }
      }
    });
  },

  startNotify(deviceId, serviceId, characteristicId) {
    wx.notifyBLECharacteristicValueChange({
      deviceId,
      serviceId,
      characteristicId,
      state: true
    });
  },

  disconnect() {
    if (this.data.bluetoothBypass) return;
    if (!this.data.deviceId) return;
    wx.closeBLEConnection({
      deviceId: this.data.deviceId,
      success: () => {
        this.setGlobalDeviceStatus(false, '');
        this.setData({
          connected: false,
          statusText: '未连接',
          deviceId: ''
        });
        this.writeCharacteristic = null;
        this.notifyCharacteristic = null;
      }
    });
  },

  closeBluetooth() {
    if (this.data.bluetoothBypass) return;
    this.stopSearch();
    this.disconnect();
    wx.closeBluetoothAdapter({});
  },

  onTextInput(e) {
    this.setData({ inputText: e.detail.value || '' });
  },

  onClearTap() {
    this.setData({ inputText: '', draftSource: 'manual', sourceLabel: '直接编辑' });
  },

  onSendTap() {
    if (!this.data.connected || !this.data.inputText || this.data.sending) return;
    const tokens = vucEncoder.textToTokens(this.data.inputText);
    this.sendTokens(tokens, this.data.inputText, this.data.draftSource);
  },

  sendTokens(tokens, text, source) {
    if (this.data.bluetoothBypass) {
      this.simulateSend(tokens, text, source);
      return;
    }
    if (!this.writeCharacteristic) {
      wx.showToast({ title: '未找到可发送设备', icon: 'none' });
      return;
    }

    this.cancelSend = false;
    this.setData({ sending: true, sendProgress: 0 });
    wx.setKeepScreenOn({ keepScreenOn: true });

    let tokenIndex = 0;
    const sendNextToken = () => {
      if (this.cancelSend) {
        this.finishCancelledSend();
        return;
      }
      if (tokenIndex >= tokens.length) {
        this.finishSuccessfulSend(text, source);
        return;
      }

      const token = tokens[tokenIndex];
      const prevToken = tokenIndex > 0 ? tokens[tokenIndex - 1] : null;
      const needSpace = sendProfile.shouldInsertSpace(prevToken, token);
      const sendContent = () => {
        const packets = token.type === 'vuc'
          ? [bleProtocol.createVucPacket(token.value)]
          : token.type === 'letter'
            ? bleProtocol.createLetterPackets(token.value)
            : [bleProtocol.createPacket(token.value)];
        this.sendPackets(packets, () => {
          tokenIndex++;
          this.finishToken(token, tokenIndex, tokens.length, sendNextToken);
        });
      };

      if (needSpace) {
        this.sendPackets([bleProtocol.createSpacePacket()], sendContent);
        return;
      }
      sendContent();
    };

    sendNextToken();
  },

  sendPackets(packets, callback) {
    let packetIndex = 0;
    const sendNextPacket = () => {
      if (packetIndex >= packets.length) {
        callback && callback();
        return;
      }
      this.sendPacket(packets[packetIndex], () => {
        packetIndex++;
        sendNextPacket();
      });
    };
    sendNextPacket();
  },

  simulateSend(tokens, text, source) {
    this.cancelSend = false;
    this.setData({ sending: true, sendProgress: 0 });
    const total = Math.max(tokens.length, 1);
    let current = 0;
    const tick = () => {
      if (this.cancelSend) {
        this.finishCancelledSend();
        return;
      }
      current++;
      this.setData({ sendProgress: Math.min(100, Math.floor((current / total) * 100)) });
      if (current >= total) {
        this.finishSuccessfulSend(text, source);
        return;
      }
      setTimeout(tick, 20);
    };
    setTimeout(tick, 20);
  },

  sendPacket(packet, callback) {
    const buffer = bleProtocol.str2ab(packet);
    const chunks = bleProtocol.splitBuffer(buffer);
    let chunkIndex = 0;
    const sendNextChunk = () => {
      if (this.cancelSend) {
        this.finishCancelledSend();
        return;
      }
      if (chunkIndex >= chunks.length) {
        callback && callback();
        return;
      }
      wx.writeBLECharacteristicValue({
        deviceId: this.data.deviceId,
        serviceId: this.writeCharacteristic.serviceId,
        characteristicId: this.writeCharacteristic.uuid,
        value: chunks[chunkIndex],
        success: () => {
          chunkIndex++;
          setTimeout(sendNextChunk, bleProtocol.CHUNK_DELAY_MS);
        },
        fail: () => {
          this.setData({ sending: false });
          wx.setKeepScreenOn({ keepScreenOn: false });
          wx.showToast({ title: '发送失败', icon: 'none' });
        }
      });
    };
    sendNextChunk();
  },

  finishToken(token, currentIndex, total, next) {
    if (this.cancelSend) return;
    this.setData({ sendProgress: Math.floor((currentIndex / total) * 100) });
    setTimeout(() => {
      if (!this.cancelSend) next();
    }, sendProfile.getTokenDelay(token));
  },

  finishSuccessfulSend(text, source) {
    this.setData({ sending: false, sendProgress: 100 });
    wx.setKeepScreenOn({ keepScreenOn: false });
    historyRecords.saveHistoryRecord({
      text,
      source: source || 'manual',
      status: 'success',
      success: true
    }).finally(() => {
      wx.showToast({ title: '发送完成', icon: 'success' });
      setTimeout(() => wx.navigateBack({ fail: () => wx.reLaunch({ url: '/pages/home/home' }) }), 500);
    });
  },

  finishCancelledSend() {
    this.setData({ sending: false, sendProgress: 0 });
    wx.setKeepScreenOn({ keepScreenOn: false });
  },

  onCancelTap() {
    if (!this.data.sending) return;
    this.cancelSend = true;
    this.finishCancelledSend();
  }
});
