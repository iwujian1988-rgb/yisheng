// pages/home/home.js
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

  // 取消发送标志
  cancelSend: false,

  // 蓝牙配置
  serviceId: '6E400001-B5A3-F393-E0A9-E50E24DCCA9E',
  writeCharacteristic: null,
  notifyCharacteristic: null,
  bluetoothInited: false,

  onLoad() {
    // 不自动初始化蓝牙，等用户点击搜索时再初始化
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

  // 连接/断开按钮
  onConnectTap() {
    if (this.data.connected) {
      this.disconnect();
    } else {
      // 先初始化蓝牙，再开始搜索
      this.initBluetooth(() => {
        this.startSearch();
      });
    }
  },

  // 初始化蓝牙
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
      fail: (err) => {
        this.addLog('蓝牙初始化失败，请使用真机调试');
        wx.showModal({
          title: '提示',
          content: '蓝牙功能需要真机调试，模拟器不支持',
          showCancel: false
        });
      }
    });
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

        // 查找目标设备
        if (name.includes('舒克') || name.includes('BLE') || name.includes('串口')) {
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
          const uuid = service.uuid.toUpperCase();
          if (uuid.includes('6E400001') || uuid.includes('1800') || uuid.includes('1801')) {
            this.getCharacteristics(deviceId, service.uuid);
            // 找到目标服务后继续检查其他服务
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
            this.writeCharacteristic.serviceId = serviceId;
            this.addLog('找到写特征值');
          }

          // 通知特征值 (硬件 -> 手机)
          if (uuid.includes('6E400003')) {
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
    if (this.data.deviceId) {
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
      const tokens = this.textToTokens(text);
      // 显示预览
      const preview = tokens.map(t => t.value).join(',');
      this.setData({ convertedText: preview });
    } else {
      this.setData({ convertedText: '' });
    }
  },

  // 清空文本
  onClearTap() {
    this.setData({
      inputText: '',
      convertedText: ''
    });
  },

  // 文本转Token队列（原子级单字队列）
  textToTokens(text) {
    const tokens = [];

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const code = char.charCodeAt(0);

      // 判断是否为汉字或中文标点
      if (/[一-龥]|[　-〿]|[＀-￯]/.test(char)) {
        // 转换为VUC格式（大写）
        let hex = code.toString(16).toUpperCase();
        while (hex.length < 4) {
          hex = '0' + hex;
        }
        tokens.push({ type: 'vuc', value: 'VUC' + hex });
      } else if (char === ' ' || char === '　') {
        // 空格保留
        tokens.push({ type: 'normal', value: char });
      } else if (char === '(' || char === ')') {
        // 英文括号转VUC
        let hex = code.toString(16).toUpperCase();
        while (hex.length < 4) {
          hex = '0' + hex;
        }
        tokens.push({ type: 'vuc', value: 'VUC' + hex });
      } else if (/[a-z]/.test(char)) {
        // 小写字母：字母+回车确认
        tokens.push({ type: 'letter', value: char });
      } else if (/[A-Z]/.test(char)) {
        // 大写字母：字母+回车确认
        tokens.push({ type: 'letter', value: char });
      } else if (/[0-9]/.test(char)) {
        // 数字：正常输入
        tokens.push({ type: 'normal', value: char });
      } else {
        // 其他字符直接添加
        tokens.push({ type: 'normal', value: char });
      }
    }

    return tokens;
  },

  // 发送按钮
  onSendTap() {
    if (!this.data.connected || !this.data.inputText || this.data.sending) {
      return;
    }

    const text = this.data.inputText;
    const tokens = this.textToTokens(text);

    this.sendTokens(tokens);
  },

  // 发送Token队列（原子级单字队列控速流）
  sendTokens(tokens) {
    if (!this.writeCharacteristic) {
      wx.showToast({ title: '未找到写特征值', icon: 'none' });
      return;
    }

    this.cancelSend = false; // 重置取消标志
    this.setData({ sending: true, sendProgress: 0 });
    this.addLog(`开始发送，共${tokens.length}个token`);

    // 保持屏幕常亮
    wx.setKeepScreenOn({
      keepScreenOn: true
    });

    let tokenIndex = 0;
    const MTU = 20;
    const that = this; // 保存this引用

    const sendNextToken = () => {
      // 检查是否取消
      if (this.cancelSend) {
        this.addLog('发送已取消');
        this.setData({ sending: false, sendProgress: 0 });
        wx.setKeepScreenOn({ keepScreenOn: false }); // 关闭屏幕常亮
        wx.showToast({ title: '已取消', icon: 'none' });
        return;
      }

      if (tokenIndex >= tokens.length) {
        this.addLog('发送完成');
        this.setData({ sending: false, sendProgress: 100 });
        wx.setKeepScreenOn({ keepScreenOn: false }); // 关闭屏幕常亮
        wx.showToast({ title: '发送完成', icon: 'success' });
        return;
      }

      const token = tokens[tokenIndex];
      const type = token.type;
      const value = token.value;
      const prevToken = tokenIndex > 0 ? tokens[tokenIndex - 1] : null;
      const prevType = prevToken ? prevToken.type : null;

      // 判断是否需要发送空格（只有字母→VUC指令时才加，数字不加）
      const needSpace = prevType === 'letter' && type === 'vuc';

      // 根据类型确定发送内容
      const sendContent = () => {
        if (type === 'vuc') {
          // VUC指令：VUC+逗号
          const packet = `SPD2|WIN11|${value},`;
          this.sendPacket(packet, () => {
            tokenIndex++;
            this.finishToken(token, tokens.length, sendNextToken);
          });
        } else if (type === 'letter') {
          // 字母：字母+回车确认
          const letterPacket = `SPD2|WIN11|${value}`;
          const enterPacket = `SPD2|WIN11|\n`;
          this.sendPacket(letterPacket, () => {
            this.sendPacket(enterPacket, () => {
              tokenIndex++;
              this.finishToken(token, tokens.length, sendNextToken);
            });
          });
        } else {
          // 普通字符：直接发送
          const packet = `SPD2|WIN11|${value}`;
          this.sendPacket(packet, () => {
            tokenIndex++;
            this.finishToken(token, tokens.length, sendNextToken);
          });
        }
      };

      // 如果需要发送空格清理
      if (needSpace) {
        const spacePacket = `SPD2|WIN11| `;
        this.sendPacket(spacePacket, () => {
          // 检查是否取消
          if (this.cancelSend) {
            this.addLog('发送已取消');
            this.setData({ sending: false });
            return;
          }
          sendContent();
        });
      } else {
        sendContent();
      }
    };

    // 发送单个数据包
    this.sendPacket = function(packet, callback) {
      // 转ArrayBuffer并分片
      const buffer = str2ab(packet);
      const chunks = [];
      for (let i = 0; i < buffer.byteLength; i += MTU) {
        chunks.push(buffer.slice(i, i + MTU));
      }

      let chunkIndex = 0;
      const sendNextChunk = () => {
        // 检查是否取消
        if (this.cancelSend) {
          // 重置状态
          that.setData({ sending: false, sendProgress: 0 });
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
            setTimeout(sendNextChunk, 20);
          },
          fail: (err) => {
            this.addLog(`发送失败: ` + JSON.stringify(err));
            this.setData({ sending: false });
            wx.setKeepScreenOn({ keepScreenOn: false }); // 关闭屏幕常亮
          }
        });
      };

      sendNextChunk();
    };

    // 完成当前token处理
    this.finishToken = function(token, total, next) {
      // 检查是否取消
      if (this.cancelSend) {
        return;
      }

      // 更新进度
      const progress = Math.floor((tokenIndex / total) * 100);
      this.setData({ sendProgress: progress });
      this.addLog(`进度: ${progress}%`);

      // 根据token类型动态延迟
      let dynamicDelay = 40; // 默认普通字符40ms
      if (token.type === 'vuc') {
        dynamicDelay = 180; // VUC需要180ms让输入法处理
      } else if (token.type === 'letter') {
        dynamicDelay = 60; // 字母稍慢一点
      } else if (token.type === 'normal' && /^[0-9]$/.test(token.value)) {
        dynamicDelay = 100; // 数字增加延迟确保上屏
      }

      setTimeout(() => {
        if (!this.cancelSend) {
          next();
        }
      }, dynamicDelay);
    };

    sendNextToken();
  },

  // 取消发送
  onCancelTap() {
    if (this.data.sending) {
      this.cancelSend = true;
      this.setData({ sending: false, sendProgress: 0 }); // 立即重置UI状态
      wx.setKeepScreenOn({ keepScreenOn: false }); // 关闭屏幕常亮
      this.addLog('正在取消发送...');
      wx.showToast({ title: '已取消', icon: 'none' });
    }
  },
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
