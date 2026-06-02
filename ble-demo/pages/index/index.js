// pages/index/index.js
Page({
  data: {
    connected: false,
    statusText: '未连接',
    deviceId: '',
    inputText: '',
    convertedText: '',
    logs: []
  },

  // 蓝牙适配器
  adapter: null,
  deviceId: null,
  serviceId: '6E400001-B5A3-F393-E0A9-E50E24DCCA9E',
  characteristicId: null,
  writeCharacteristic: null,
  notifyCharacteristic: null,

  onLoad() {
    this.initBluetooth();
  },

  onUnload() {
    this.closeBluetooth();
  },

  // 添加日志
  addLog(message) {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    const logs = this.data.logs;
    logs.unshift({ time, message });
    if (logs.length > 50) logs.pop();
    this.setData({ logs });
  },

  // 初始化蓝牙
  initBluetooth() {
    wx.openBluetoothAdapter({
      success: () => {
        this.addLog('蓝牙适配器初始化成功');
        this.setData({ statusText: '已就绪' });
      },
      fail: (err) => {
        this.addLog('蓝牙初始化失败: ' + JSON.stringify(err));
        wx.showToast({ title: '请开启蓝牙', icon: 'none' });
      }
    });
  },

  // 连接/断开按钮
  onConnectTap() {
    if (this.data.connected) {
      this.disconnect();
    } else {
      this.startSearch();
    }
  },

  // 开始搜索设备
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

  // 发现设备
  onDeviceFound() {
    wx.onBluetoothDeviceFound((res) => {
      const devices = res.devices;
      for (let device of devices) {
        const name = device.name || device.localName || '';
        this.addLog(`发现设备: ${name} (${device.deviceId})`);

        // 查找目标设备（舒克无线智能外设）
        if (name.includes('舒克') || name.includes('BLE')) {
          this.stopSearch();
          this.connectDevice(device.deviceId);
          return;
        }
      }
    });

    // 10秒后停止搜索
    setTimeout(() => {
      if (this.data.statusText === '搜索中...') {
        this.stopSearch();
        this.setData({ statusText: '未找到设备' });
        wx.showModal({
          title: '提示',
          content: '未找到目标设备，请确认设备已开启蓝牙',
          showCancel: false
        });
      }
    }, 10000);
  },

  // 停止搜索
  stopSearch() {
    wx.stopBluetoothDevicesDiscovery({
      success: () => {
        this.addLog('停止搜索');
      }
    });
  },

  // 连接设备
  connectDevice(deviceId) {
    this.setData({ statusText: '连接中...' });

    wx.createBLEConnection({
      deviceId,
      success: () => {
        this.addLog('设备连接成功');
        this.deviceId = deviceId;
        this.setData({ deviceId });
        this.getServices(deviceId);
      },
      fail: (err) => {
        this.addLog('连接失败: ' + JSON.stringify(err));
        this.setData({ statusText: '连接失败' });
      }
    });
  },

  // 获取服务
  getServices(deviceId) {
    wx.getBLEDeviceServices({
      deviceId,
      success: (res) => {
        this.addLog(`发现${res.services.length}个服务`);
        for (let service of res.services) {
          if (service.uuid.toUpperCase().includes('6E400001')) {
            this.getCharacteristics(deviceId, service.uuid);
            return;
          }
        }
      },
      fail: (err) => {
        this.addLog('获取服务失败: ' + JSON.stringify(err));
      }
    });
  },

  // 获取特征值
  getCharacteristics(deviceId, serviceId) {
    wx.getBLEDeviceCharacteristics({
      deviceId,
      serviceId,
      success: (res) => {
        this.addLog(`发现${res.characteristics.length}个特征值`);
        for (let char of res.characteristics) {
          const uuid = char.uuid.toUpperCase();

          // 写特征值 (手机 -> 硬件)
          if (uuid.includes('6E400002')) {
            this.writeCharacteristic = char;
            this.addLog('找到写特征值');
          }

          // 通知特征值 (硬件 -> 手机)
          if (uuid.includes('6E400003')) {
            this.notifyCharacteristic = char;
            this.notifyCharacteristic.serviceId = serviceId;
            this.startNotify(deviceId, serviceId, char.uuid);
          }
        }

        if (this.writeCharacteristic) {
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

  // 开启通知
  startNotify(deviceId, serviceId, characteristicId) {
    wx.notifyBLECharacteristicValueChange({
      deviceId,
      serviceId,
      characteristicId,
      state: true,
      success: () => {
        this.addLog('已开启通知');

        // 监听硬件返回的数据
        wx.onBLECharacteristicValueChange((res) => {
          const value = ab2hex(res.value);
          this.addLog(`收到数据: ${value}`);
        });
      }
    });
  },

  // 断开连接
  disconnect() {
    if (this.deviceId) {
      wx.closeBLEConnection({
        deviceId: this.deviceId,
        success: () => {
          this.addLog('已断开连接');
          this.setData({
            connected: false,
            statusText: '未连接',
            deviceId: ''
          });
          this.deviceId = null;
          this.writeCharacteristic = null;
          this.notifyCharacteristic = null;
        }
      });
    }
  },

  // 关闭蓝牙
  closeBluetooth() {
    this.stopSearch();
    this.disconnect();
    wx.closeBluetoothAdapter({
      success: () => {
        this.addLog('蓝牙已关闭');
      }
    });
  },

  // 文本输入
  onTextInput(e) {
    const text = e.detail.value;
    this.setData({ inputText: text });

    if (text) {
      const converted = this.textToVUC(text);
      this.setData({ convertedText: converted });
    } else {
      this.setData({ convertedText: '' });
    }
  },

  // 文本转VUC格式
  textToVUC(text) {
    const result = [];
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code < 128) {
        // ASCII字符直接保留
        result.push(text[i]);
      } else {
        // 中文转vuc格式
        const hex = code.toString(16).toLowerCase();
        result.push('vuc' + hex);
      }
      result.push(' '); // 字符间加空格
    }
    return result.join(' ').trim();
  },

  // 发送按钮
  onSendTap() {
    if (!this.data.connected || !this.data.inputText) {
      return;
    }

    const text = this.data.inputText;
    const converted = this.textToVUC(text);

    // 构造发送数据包: SPD2|WIN11|vuc8212 vuc514b ...
    const packet = `SPD2|WIN11|${converted}`;

    this.sendData(packet);
  },

  // 发送数据
  sendData(data) {
    if (!this.writeCharacteristic) {
      wx.showToast({ title: '未找到写特征值', icon: 'none' });
      return;
    }

    // 字符串转ArrayBuffer
    const buffer = str2ab(data);

    // 微信小程序蓝牙MTU限制，需要分片发送
    const MTU = 20; // 默认MTU
    const chunks = [];
    for (let i = 0; i < buffer.byteLength; i += MTU) {
      chunks.push(buffer.slice(i, i + MTU));
    }

    this.addLog(`开始发送，共${chunks.length}个数据包`);

    let index = 0;
    const sendNext = () => {
      if (index >= chunks.length) {
        this.addLog('发送完成');
        wx.showToast({ title: '发送完成', icon: 'success' });
        return;
      }

      wx.writeBLECharacteristicValue({
        deviceId: this.deviceId,
        serviceId: this.serviceId,
        characteristicId: this.writeCharacteristic.uuid,
        value: chunks[index],
        success: () => {
          index++;
          setTimeout(sendNext, 20); // 延迟20ms发送下一包
        },
        fail: (err) => {
          this.addLog(`发送失败(包${index}): ` + JSON.stringify(err));
        }
      });
    };

    sendNext();
  }
});

// 工具函数：字符串转ArrayBuffer
function str2ab(str) {
  const buffer = new ArrayBuffer(str.length);
  const dataView = new DataView(buffer);
  for (let i = 0; i < str.length; i++) {
    dataView.setUint8(i, str.charCodeAt(i));
  }
  return buffer;
}

// 工具函数：ArrayBuffer转十六进制字符串
function ab2hex(buffer) {
  const hexArr = [];
  const bufferArr = new Uint8Array(buffer);
  for (let i = 0; i < bufferArr.length; i++) {
    const hex = bufferArr[i].toString(16).toUpperCase().padStart(2, '0');
    hexArr.push(hex);
  }
  return hexArr.join(' ');
}
