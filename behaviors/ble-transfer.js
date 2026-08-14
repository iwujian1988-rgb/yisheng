const vucEncoder = require('../utils/encoder/vuc');
const bleProtocol = require('../utils/ble/protocol');
const sendProfile = require('../utils/ble/send-profile');
const bleLink = require('../services/device/ble-link');
const transferSettings = require('../services/settings/transfer-settings');
const transferDemo = require('../services/device/transfer-demo');
module.exports = Behavior({
  data: {
    connected: false,
    statusText: '未连接',
    deviceId: '',
    sending: false,
    sendPaused: false,
    sendProgress: 0,
    stayOnPageAfterSend: false
  },

  lifetimes: {
    detached() {
      this.endTransferSession();
      this.cancelPendingAck();
      this.cancelScheduledReconnect();
      if (this._bleConnectionStateListener && wx.offBLEConnectionStateChange) {
        wx.offBLEConnectionStateChange(this._bleConnectionStateListener);
      }
      if (this._bleNotifyListener && wx.offBLECharacteristicValueChange) {
        wx.offBLECharacteristicValueChange(this._bleNotifyListener);
      }
      if (this._bleDeviceFoundListener && wx.offBluetoothDeviceFound) {
        wx.offBluetoothDeviceFound(this._bleDeviceFoundListener);
      }
      if (this.closeBluetoothOnDetach) {
        this.closeBluetooth();
      }
    }
  },
  methods: {
    beginTransferSession() {
      this._activeTransferSpeedMode = transferSettings.getTransferSettings().speedMode;
      const app = typeof getApp === 'function' ? getApp() : null;
      if (app && app.globalData) {
        app.globalData.transferSending = true;
        app.globalData.activeTransferSpeedMode = this._activeTransferSpeedMode;
      }
    },

    endTransferSession() {
      this._activeTransferSpeedMode = '';
      const app = typeof getApp === 'function' ? getApp() : null;
      if (app && app.globalData) {
        app.globalData.transferSending = false;
        app.globalData.activeTransferSpeedMode = '';
      }
    },

    getActiveTransferSpeedMode() {
      return this._activeTransferSpeedMode || transferSettings.getTransferSettings().speedMode;
    },

    cancelScheduledReconnect() {
      if (!this._bleReconnectTimer) return;
      clearTimeout(this._bleReconnectTimer);
      this._bleReconnectTimer = null;
    },

    scheduleReconnect() {
      if (this.manualDisconnect || !bleLink.shouldAutoReconnect() || this._bleReconnectTimer) return;
      const delays = [800, 1600, 3200, 5000, 8000];
      const attempt = Math.min(this._bleReconnectAttempt || 0, delays.length - 1);
      this._bleReconnectTimer = setTimeout(() => {
        this._bleReconnectTimer = null;
        this._bleReconnectAttempt = attempt + 1;
        this.tryReconnectBoundDevice();
      }, delays[attempt]);
    },

    setGlobalDeviceStatus(connected, deviceId) {
      const app = typeof getApp === 'function' ? getApp() : null;
      if (app && app.globalData) {
        app.globalData.deviceId = deviceId || null;
        if (connected && deviceId) {
          bleLink.markBleLinkReady(deviceId);
        } else if (!connected) {
          bleLink.clearBleLink();
        }
      }
    },

    tryReconnectBoundDevice() {
      const deviceId = bleLink.getStoredBleDeviceId();
      if (!deviceId || this.reconnecting || this.data.connected) {
        return;
      }

      this.reconnecting = true;
      this.manualDisconnect = false;
      this.initBluetooth(() => {
        this.connectDevice(deviceId);
      });
    },

    resumeBleConnection() {
      const deviceId = bleLink.getStoredBleDeviceId();
      if (!deviceId || this.reconnecting || (this.data.connected && this.writeCharacteristic)) return;
      this.manualDisconnect = false;
      this.initBluetooth(() => {
        if (typeof wx.getConnectedBluetoothDevices !== 'function') {
          this.tryReconnectBoundDevice();
          return;
        }
        wx.getConnectedBluetoothDevices({
          services: [bleProtocol.SERVICE_ID],
          success: (res) => {
            const connected = (res.devices || []).some((item) => item.deviceId === deviceId);
            if (!connected) {
              this.setData({ connected: false });
              this.tryReconnectBoundDevice();
              return;
            }
            this.setData({ deviceId });
            this.bindConnectionStateListener();
            this.requestBleMtu(deviceId);
            this.getServices(deviceId);
          },
          fail: () => {
            this.setData({ connected: false });
            this.tryReconnectBoundDevice();
          }
        });
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
          callback && callback();
        },
        fail: () => {
          this.reconnecting = false;
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
      if (this._bleDeviceFoundListener && wx.offBluetoothDeviceFound) {
        wx.offBluetoothDeviceFound(this._bleDeviceFoundListener);
      }
      this._bleDeviceFoundListener = (res) => {
        const devices = res.devices || [];
        for (let i = 0; i < devices.length; i++) {
          const device = devices[i];
          const name = device.name || device.localName || '';
          if (name.includes('BLE') || name.includes('VUC') || name.includes('HID') || name.includes('舒克') || name.includes('DEV') || name.includes('YS-')) {
            this.stopSearch();
            this.connectDevice(device.deviceId);
            return;
          }
        }
      };
      wx.onBluetoothDeviceFound(this._bleDeviceFoundListener);

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
          this.bindConnectionStateListener();
          this.requestBleMtu(deviceId);
          this.getServices(deviceId);
        },
        fail: () => {
          this.reconnecting = false;
          this.scheduleReconnect();
          this.setData({ statusText: '连接失败' });
        }
      });
    },

    bindConnectionStateListener() {
      if (!wx.onBLEConnectionStateChange || this._bleConnectionStateListener) return;

      this._bleConnectionStateListener = (res) => {
        const currentDeviceId = this.data.deviceId || bleLink.getStoredBleDeviceId();
        if (!res || res.connected || !currentDeviceId || res.deviceId !== currentDeviceId) return;

        this.reconnecting = false;
        this.writeCharacteristic = null;
        this.notifyCharacteristic = null;
        this.setGlobalDeviceStatus(false, '');
        this.setData({
          connected: false,
          statusText: '连接已断开',
          deviceId: ''
        });
        if (typeof this.refreshDeviceStatus === 'function') {
          this.refreshDeviceStatus();
        }
        this.scheduleReconnect();
      };
      wx.onBLEConnectionStateChange(this._bleConnectionStateListener);
    },

    getServices(deviceId) {
      wx.getBLEDeviceServices({
        deviceId,
        success: (res) => {
          const services = res.services || [];
          for (let i = 0; i < services.length; i++) {
            const uuid = services[i].uuid.toUpperCase();
            if (uuid.includes('6E400001')) {
              this.getCharacteristics(deviceId, services[i].uuid);
              return;
            }
          }
          this.reconnecting = false;
          this.setData({ statusText: '未找到传输服务' });
        },
        fail: () => {
          this.reconnecting = false;
          this.setData({ statusText: '服务发现失败' });
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
            this.reconnecting = false;
            this._bleReconnectAttempt = 0;
            this.cancelScheduledReconnect();
            this.setGlobalDeviceStatus(true, deviceId);
            this.setData({ connected: true, statusText: '已连接' });
            if (typeof this.refreshDeviceStatus === 'function') {
              this.refreshDeviceStatus();
            }
          } else if (!this.writeCharacteristic) {
            this.reconnecting = false;
            this.setData({ statusText: '设备特征不匹配' });
          }
        },
        fail: () => {
          this.reconnecting = false;
          this.setData({ statusText: '特征发现失败' });
        }
      });
    },

    requestBleMtu(deviceId) {
      this.bleWriteMtu = bleProtocol.DEFAULT_MTU;
      if (typeof wx.setBLEMTU !== 'function') {
        return;
      }
      wx.setBLEMTU({
        deviceId,
        mtu: 512,
        success: (res) => {
          const negotiated = res && res.mtu ? res.mtu - 3 : bleProtocol.DEFAULT_MTU;
          this.bleWriteMtu = Math.max(bleProtocol.DEFAULT_MTU, Math.min(negotiated, 512));
        },
        fail: () => {
          this.bleWriteMtu = bleProtocol.DEFAULT_MTU;
        }
      });
    },

    startNotify(deviceId, serviceId, characteristicId) {
      const that = this;
      wx.notifyBLECharacteristicValueChange({
        deviceId,
        serviceId,
        characteristicId,
        state: true,
        success: () => {
          if (!that._bleNotifyListenerBound) {
            that._bleNotifyListenerBound = true;
            that._bleNotifyListener = (res) => {
              that.handleBleCharacteristicValueChange(res);
            };
            wx.onBLECharacteristicValueChange(that._bleNotifyListener);
          }
        }
      });
    },

    shouldUseAckFlow() {
      return transferSettings.usesAckFlow(this.getActiveTransferSpeedMode());
    },

    handleBleCharacteristicValueChange(res) {
      if (!res || res.deviceId !== this.data.deviceId) return;
      const charId = String(res.characteristicId || '').toUpperCase();
      if (!charId.includes(bleProtocol.NOTIFY_CHARACTERISTIC_FRAGMENT)) return;
      const message = bleProtocol.ab2str(res.value);
      if (message.indexOf('DONE') !== 0) return;
      if (this._ackWaiter && this._ackWaiter.resolve) {
        this.resolveDeviceAck();
        return;
      }
      this._deviceAckReady = true;
    },

    consumeDeviceAck(onSuccess) {
      if (this._deviceAckReady) {
        this._deviceAckReady = false;
        onSuccess && onSuccess();
        return true;
      }
      return false;
    },

    waitForDeviceAck(onSuccess, onFail) {
      if (this.cancelSend) {
        onFail && onFail();
        return;
      }
      if (this.consumeDeviceAck(onSuccess)) {
        return;
      }
      this.cancelPendingAck();
      const timeoutMs = transferSettings.getAckTimeoutMs();
      this._ackWaiter = {
        resolve: () => {
          clearTimeout(this._ackTimer);
          this._ackWaiter = null;
          onSuccess && onSuccess();
        },
        reject: () => {
          clearTimeout(this._ackTimer);
          this._ackWaiter = null;
          onFail && onFail();
        }
      };
      this._ackTimer = setTimeout(() => {
        if (this._ackWaiter) {
          this._ackWaiter.reject();
        }
      }, timeoutMs);
    },

    resolveDeviceAck() {
      if (this._ackWaiter && this._ackWaiter.resolve) {
        this._ackWaiter.resolve();
      }
    },

    cancelPendingAck() {
      if (this._ackWaiter && this._ackWaiter.reject) {
        this._ackWaiter.reject();
      }
      clearTimeout(this._ackTimer);
      this._ackWaiter = null;
    },

    finishPacketWithAck(callback) {
      const onPacketSent = () => {
        callback && callback();
      };
      if (!this.shouldUseAckFlow()) {
        onPacketSent();
        return;
      }
      if (this.consumeDeviceAck(onPacketSent)) {
        return;
      }
      this.waitForDeviceAck(
        onPacketSent,
        () => {
          if (this.cancelSend) {
            this.finishCancelledSend();
            return;
          }
          this._resumeSend = null;
          this.setData({ sending: false, sendPaused: false });
          this.endTransferSession();
          wx.setKeepScreenOn({ keepScreenOn: false });
          wx.showToast({ title: '设备响应超时', icon: 'none' });
        }
      );
    },
    disconnect(options) {
      const isManual = !options || options.manual !== false;
      this.manualDisconnect = isManual;
      this.cancelScheduledReconnect();
      if (isManual) {
        bleLink.setAutoReconnectEnabled(false);
      }
      const deviceId = this.data.deviceId || bleLink.getStoredBleDeviceId();
      if (!deviceId) {
        this.setGlobalDeviceStatus(false, '');
        this.setData({
          connected: false,
          statusText: '未连接',
          deviceId: ''
        });
        if (typeof this.refreshDeviceStatus === 'function') {
          this.refreshDeviceStatus();
        }
        this.writeCharacteristic = null;
        this.notifyCharacteristic = null;
        return;
      }
      wx.closeBLEConnection({
        deviceId,
        success: () => {
          this.setGlobalDeviceStatus(false, '');
          this.setData({
            connected: false,
            statusText: '未连接',
            deviceId: ''
          });
          if (typeof this.refreshDeviceStatus === 'function') {
            this.refreshDeviceStatus();
          }
          this.writeCharacteristic = null;
          this.notifyCharacteristic = null;
          if (typeof this.onBleDisconnected === 'function') {
            this.onBleDisconnected();
          }
        }
      });
    },

    closeBluetooth() {
      this.stopSearch();
      this.disconnect({ manual: this.manualDisconnect });
      wx.closeBluetoothAdapter({});
      this.bluetoothInited = false;
    },

    sendTokens(tokens, text, source) {
      // 演示设备只替换底层蓝牙写入；编码、历史和 UI 仍走正式流程。
      if (transferDemo.isActive()) {
        this.cancelSend = false;
        this.beginTransferSession();
        this.setData({ sending: true, sendPaused: false, sendProgress: 0 });
        wx.setKeepScreenOn({ keepScreenOn: true });
        const total = (tokens && tokens.length) || 1;
        let i = 0;
        const step = () => {
          if (this.cancelSend) { this.finishCancelledSend(); return; }
          if (this.data.sendPaused) { this._resumeSend = step; return; }
          if (i >= total) { this.finishSuccessfulSend(text, source); return; }
          i += 1;
          this.setData({ sendProgress: Math.floor((i / total) * 100) });
          setTimeout(step, 40);
        };
        step();
        return;
      }

      if (!this.writeCharacteristic) {
        wx.showToast({ title: '未找到可发送设备', icon: 'none' });
        return;
      }

      this.cancelSend = false;
      this._resumeSend = null;
      this.beginTransferSession();
      this.setData({ sending: true, sendPaused: false, sendProgress: 0 });
      wx.setKeepScreenOn({ keepScreenOn: true });

      let tokenIndex = 0;
      const sendNextToken = () => {
        if (this.cancelSend) {
          this.finishCancelledSend();
          return;
        }
        if (this.data.sendPaused) {
          this._resumeSend = sendNextToken;
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
            ? [bleProtocol.createVucPacket(token.value, this.getActiveTransferSpeedMode())]
            : token.type === 'letter'
              ? bleProtocol.createLetterPackets(token.value, this.getActiveTransferSpeedMode())
              : [bleProtocol.createPacket(token.value, this.getActiveTransferSpeedMode())];
          this.sendPackets(packets, () => {
            tokenIndex++;
            this.finishToken(token, tokenIndex, tokens.length, sendNextToken);
          });
        };

        if (needSpace) {
          this.sendPackets([bleProtocol.createSpacePacket(this.getActiveTransferSpeedMode())], sendContent);
          return;
        }
        sendContent();
      };

      sendNextToken();
    },

    sendPackets(packets, callback) {
      let packetIndex = 0;
      const sendNextPacket = () => {
        if (this.data.sendPaused) {
          this._resumeSend = sendNextPacket;
          return;
        }
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

    sendPacket(packet, callback) {
      this._deviceAckReady = false;
      const buffer = bleProtocol.str2ab(packet);
      const mtu = this.bleWriteMtu || bleProtocol.DEFAULT_MTU;
      const chunks = bleProtocol.splitBuffer(buffer, mtu);
      let chunkIndex = 0;
      const sendNextChunk = () => {
        if (this.cancelSend) {
          this.finishCancelledSend();
          return;
        }
        if (this.data.sendPaused) {
          this._resumeSend = sendNextChunk;
          return;
        }
        if (chunkIndex >= chunks.length) {
          this.finishPacketWithAck(callback);
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
            this._resumeSend = null;
            this.setData({ sending: false, sendPaused: false });
            this.endTransferSession();
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
      // DONE means the device finished pressing the commit key, not that the
      // Windows IME has already returned to an idle composition state. Keep the
      // selected token interval after ACK so consecutive VUC commands cannot
      // overlap inside Microsoft Pinyin.
      const delay = sendProfile.getTokenDelay(token, this.getActiveTransferSpeedMode());
      setTimeout(() => {
        if (this.cancelSend) return;
        if (this.data.sendPaused) {
          this._resumeSend = next;
          return;
        }
        next();
      }, delay);
    },
    finishSuccessfulSend(text, source) {
      const stayOnPage = this.data.stayOnPageAfterSend;
      this.endTransferSession();
      this.setData({
        sending: false,
        sendPaused: false,
        sendProgress: 100,
        inputText: stayOnPage ? '' : this.data.inputText
      });
      wx.setKeepScreenOn({ keepScreenOn: false });
      wx.showToast({ title: '发送完成', icon: 'success' });
      if (stayOnPage) {
        if (typeof this.onTransferComplete === 'function') {
          this.onTransferComplete(text, source);
        }
        return;
      }
      setTimeout(() => wx.navigateBack({ fail: () => wx.reLaunch({ url: '/pages/home/home' }) }), 500);
    },

    finishCancelledSend() {
      this.cancelPendingAck();
      this._resumeSend = null;
      this.endTransferSession();
      this.setData({ sending: false, sendPaused: false, sendProgress: 0 });
      wx.setKeepScreenOn({ keepScreenOn: false });
    },
    onPauseSendTap() {
      if (!this.data.sending) return;
      if (!this.data.sendPaused) {
        this.setData({ sendPaused: true });
        return;
      }
      const resume = this._resumeSend;
      this._resumeSend = null;
      this.setData({ sendPaused: false }, () => {
        if (resume) resume();
      });
    },
    onCancelSendTap() {
      if (!this.data.sending) return;
      this.cancelSend = true;
      this.finishCancelledSend();
    }
  }
});
