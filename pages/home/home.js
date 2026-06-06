const vucEncoder = require('../../utils/encoder/vuc');
const bleProtocol = require('../../utils/ble/protocol');
const sendProfile = require('../../utils/ble/send-profile');
const draftService = require('../../services/content/draft');
const authGuard = require('../../services/auth/guard');
const historyRecords = require('../../services/history/records');

Page({
  data: {
    connected: false,
    statusText: '未连接',
    deviceId: '',
    inputText: '',
    convertedText: '',
    logs: [],
    sending: false,
    sendProgress: 0
  },

  cancelSend: false,
  serviceId: bleProtocol.SERVICE_ID,
  writeCharacteristic: null,
  notifyCharacteristic: null,
  bluetoothInited: false,

  onLoad() {},

  onShow() {
    if (!authGuard.requireActiveAccount()) return;
    const draft = draftService.consumeDraft();
    if (draft && draft.text) {
      const tokens = this.textToTokens(draft.text);
      this.setData({
        inputText: draft.text,
        convertedText: vucEncoder.tokensToPreview(tokens)
      });
      this.addLog('已载入待发送文本');
    }
  },

  onUnload() {
    this.closeBluetooth();
  },

  addLog(message) {
    const now = new Date();
    const time = [
      now.getHours().toString().padStart(2, '0'),
      now.getMinutes().toString().padStart(2, '0'),
      now.getSeconds().toString().padStart(2, '0')
    ].join(':');
    const logs = this.data.logs.slice();
    logs.unshift({ time, message });
    if (logs.length > 50) logs.pop();
    this.setData({ logs });
  },

  onConnectTap() {
    if (this.data.connected) {
      this.disconnect();
      return;
    }
    this.initBluetooth(() => {
      this.startSearch();
    });
  },

  initBluetooth(callback) {
    if (this.bluetoothInited) {
      callback && callback();
      return;
    }

    wx.openBluetoothAdapter({
      success: () => {
        this.bluetoothInited = true;
        this.addLog('蓝牙适配器初始化成功');
        this.setData({ statusText: '已就绪' });
        callback && callback();
      },
      fail: () => {
        this.addLog('蓝牙初始化失败，请使用真机调试');
        wx.showModal({
          title: '提示',
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
      success: () => {
        this.addLog('开始搜索设备...');
        this.onDeviceFound();
      },
      fail: (err) => {
        this.addLog('搜索失败: ' + JSON.stringify(err));
      }
    });
  },

  onDeviceFound() {
    wx.onBluetoothDeviceFound((res) => {
      const devices = res.devices || [];
      for (let i = 0; i < devices.length; i++) {
        const device = devices[i];
        const name = device.name || device.localName || '';
        this.addLog('发现设备: ' + name + ' (' + device.deviceId + ')');

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
        wx.showModal({
          title: '提示',
          content: '未找到目标设备，请确认设备已开启并靠近手机。',
          showCancel: false
        });
      }
    }, 10000);
  },

  stopSearch() {
    wx.stopBluetoothDevicesDiscovery({
      success: () => {
        this.addLog('停止搜索');
      }
    });
  },

  connectDevice(deviceId) {
    this.setData({ statusText: '连接中...' });

    wx.createBLEConnection({
      deviceId,
      success: () => {
        this.addLog('设备连接成功');
        this.setData({ deviceId });
        this.getServices(deviceId);
      },
      fail: (err) => {
        this.addLog('连接失败: ' + JSON.stringify(err));
        this.setData({ statusText: '连接失败' });
      }
    });
  },

  getServices(deviceId) {
    wx.getBLEDeviceServices({
      deviceId,
      success: (res) => {
        this.addLog('发现 ' + res.services.length + ' 个服务');
        for (let i = 0; i < res.services.length; i++) {
          const service = res.services[i];
          const uuid = service.uuid.toUpperCase();
          if (uuid.includes('6E400001') || uuid.includes('1800') || uuid.includes('1801')) {
            this.getCharacteristics(deviceId, service.uuid);
          }
        }
      },
      fail: (err) => {
        this.addLog('获取服务失败: ' + JSON.stringify(err));
      }
    });
  },

  getCharacteristics(deviceId, serviceId) {
    wx.getBLEDeviceCharacteristics({
      deviceId,
      serviceId,
      success: (res) => {
        this.addLog('发现 ' + res.characteristics.length + ' 个特征值');
        for (let i = 0; i < res.characteristics.length; i++) {
          const char = res.characteristics[i];
          const uuid = char.uuid.toUpperCase();

          if (uuid.includes(bleProtocol.WRITE_CHARACTERISTIC_FRAGMENT)) {
            this.writeCharacteristic = char;
            this.writeCharacteristic.serviceId = serviceId;
            this.addLog('找到写特征值');
          }

          if (uuid.includes(bleProtocol.NOTIFY_CHARACTERISTIC_FRAGMENT)) {
            this.notifyCharacteristic = char;
            this.notifyCharacteristic.serviceId = serviceId;
            this.startNotify(deviceId, serviceId, char.uuid);
          }
        }

        if (this.writeCharacteristic && !this.data.connected) {
          this.setData({
            connected: true,
            statusText: '已连接'
          });
          wx.showToast({ title: '连接成功', icon: 'success' });
        }
      },
      fail: (err) => {
        this.addLog('获取特征值失败: ' + JSON.stringify(err));
      }
    });
  },

  startNotify(deviceId, serviceId, characteristicId) {
    wx.notifyBLECharacteristicValueChange({
      deviceId,
      serviceId,
      characteristicId,
      state: true,
      success: () => {
        this.addLog('已开启通知');
        wx.onBLECharacteristicValueChange((res) => {
          const value = bleProtocol.ab2hex(res.value);
          this.addLog('收到数据: ' + value);
        });
      }
    });
  },

  disconnect() {
    if (!this.data.deviceId) return;
    wx.closeBLEConnection({
      deviceId: this.data.deviceId,
      success: () => {
        this.addLog('已断开连接');
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
    this.stopSearch();
    this.disconnect();
    wx.closeBluetoothAdapter({
      success: () => {
        this.addLog('蓝牙已关闭');
      }
    });
  },

  onTextInput(e) {
    const text = e.detail.value || '';
    this.setData({ inputText: text });

    if (text) {
      const tokens = this.textToTokens(text);
      this.setData({ convertedText: vucEncoder.tokensToPreview(tokens) });
      return;
    }
    this.setData({ convertedText: '' });
  },

  onClearTap() {
    this.setData({
      inputText: '',
      convertedText: ''
    });
  },

  textToTokens(text) {
    return vucEncoder.textToTokens(text);
  },

  onSendTap() {
    if (!this.data.connected || !this.data.inputText || this.data.sending) {
      return;
    }

    const tokens = this.textToTokens(this.data.inputText);
    this.sendTokens(tokens, this.data.inputText);
  },

  sendTokens(tokens, text) {
    if (!this.writeCharacteristic) {
      wx.showToast({ title: '未找到写特征值', icon: 'none' });
      return;
    }

    this.cancelSend = false;
    this.setData({ sending: true, sendProgress: 0 });
    this.addLog('开始发送，共 ' + tokens.length + ' 个 token');
    wx.setKeepScreenOn({ keepScreenOn: true });

    let tokenIndex = 0;

    const sendNextToken = () => {
      if (this.cancelSend) {
        this.finishCancelledSend();
        return;
      }

      if (tokenIndex >= tokens.length) {
        this.finishSuccessfulSend(text);
        return;
      }

      const token = tokens[tokenIndex];
      const prevToken = tokenIndex > 0 ? tokens[tokenIndex - 1] : null;
      const needSpace = sendProfile.shouldInsertSpace(prevToken, token);

      const sendContent = () => {
        if (token.type === 'vuc') {
          const packet = bleProtocol.createVucPacket(token.value);
          this.sendPacket(packet, () => {
            tokenIndex++;
            this.finishToken(token, tokenIndex, tokens.length, sendNextToken);
          });
          return;
        }

        if (token.type === 'letter') {
          const packets = bleProtocol.createLetterPackets(token.value);
          this.sendPacket(packets[0], () => {
            this.sendPacket(packets[1], () => {
              tokenIndex++;
              this.finishToken(token, tokenIndex, tokens.length, sendNextToken);
            });
          });
          return;
        }

        const packet = bleProtocol.createPacket(token.value);
        this.sendPacket(packet, () => {
          tokenIndex++;
          this.finishToken(token, tokenIndex, tokens.length, sendNextToken);
        });
      };

      if (needSpace) {
        const spacePacket = bleProtocol.createSpacePacket();
        this.sendPacket(spacePacket, () => {
          if (this.cancelSend) {
            this.finishCancelledSend();
            return;
          }
          sendContent();
        });
        return;
      }

      sendContent();
    };

    sendNextToken();
  },

  sendPacket(packet, callback) {
    const buffer = bleProtocol.str2ab(packet);
    const chunks = bleProtocol.splitBuffer(buffer);
    let chunkIndex = 0;

    const sendNextChunk = () => {
      if (this.cancelSend) {
        this.setData({ sending: false, sendProgress: 0 });
        wx.setKeepScreenOn({ keepScreenOn: false });
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
        fail: (err) => {
          this.addLog('发送失败: ' + JSON.stringify(err));
          this.setData({ sending: false });
          wx.setKeepScreenOn({ keepScreenOn: false });
        }
      });
    };

    sendNextChunk();
  },

  finishToken(token, currentIndex, total, next) {
    if (this.cancelSend) return;
    const progress = Math.floor((currentIndex / total) * 100);
    this.setData({ sendProgress: progress });
    this.addLog('进度: ' + progress + '%');

    const dynamicDelay = sendProfile.getTokenDelay(token);
    setTimeout(() => {
      if (!this.cancelSend) {
        next();
      }
    }, dynamicDelay);
  },

  finishSuccessfulSend(text) {
    this.addLog('发送完成');
    this.setData({ sending: false, sendProgress: 100 });
    wx.setKeepScreenOn({ keepScreenOn: false });
    historyRecords.saveHistoryRecord({
      text,
      source: 'manual',
      status: 'success',
      success: true
    });
    wx.showToast({ title: '发送完成', icon: 'success' });
  },

  finishCancelledSend() {
    this.addLog('发送已取消');
    this.setData({ sending: false, sendProgress: 0 });
    wx.setKeepScreenOn({ keepScreenOn: false });
    wx.showToast({ title: '已取消', icon: 'none' });
  },

  onCancelTap() {
    if (!this.data.sending) return;
    this.cancelSend = true;
    this.setData({ sending: false, sendProgress: 0 });
    wx.setKeepScreenOn({ keepScreenOn: false });
    this.addLog('正在取消发送...');
    wx.showToast({ title: '已取消', icon: 'none' });
  }
});
