var binding = require('../../services/device/binding');
var bleProtocol = require('../../utils/ble/protocol');

var DEVICE_NAME_KEYWORDS = ['BLE', 'VUC', 'HID', '舒克'];
var SCAN_TIMEOUT = 10000;

Page({
  data: {
    status: 'idle',
    statusText: '点击下方按钮开始扫描',
    devices: [],
    connectedDeviceId: '',
    connectedDeviceName: ''
  },

  bluetoothInited: false,
  foundDevices: {},
  scanTimer: null,

  onLoad: function () {
    this.initBluetooth();
  },

  onUnload: function () {
    this.stopScan();
    if (this.data.connectedDeviceId) {
      wx.closeBLEConnection({ deviceId: this.data.connectedDeviceId });
    }
  },

  initBluetooth: function () {
    var that = this;
    wx.openBluetoothAdapter({
      success: function () {
        that.bluetoothInited = true;
        that.setData({ statusText: '蓝牙已就绪，点击扫描' });
      },
      fail: function () {
        that.setData({ status: 'error', statusText: '请开启手机蓝牙' });
      }
    });
  },

  startScan: function () {
    if (!this.bluetoothInited) {
      this.initBluetooth();
      return;
    }
    var that = this;
    this.foundDevices = {};
    this.setData({ status: 'scanning', statusText: '扫描中...', devices: [] });

    wx.startBluetoothDevicesDiscovery({
      allowDuplicatesKey: false,
      success: function () {
        that.onDeviceFound();
        that.scanTimer = setTimeout(function () {
          if (that.data.status === 'scanning') {
            that.stopScan();
            if (Object.keys(that.foundDevices).length === 0) {
              that.setData({ status: 'empty', statusText: '未找到设备，请确认设备已通电' });
            }
          }
        }, SCAN_TIMEOUT);
      },
      fail: function () {
        that.setData({ status: 'error', statusText: '扫描失败，请检查蓝牙权限' });
      }
    });
  },

  onDeviceFound: function () {
    var that = this;
    wx.onBluetoothDeviceFound(function (res) {
      var devices = res.devices || [];
      for (var i = 0; i < devices.length; i++) {
        var device = devices[i];
        var name = device.name || device.localName || '';
        if (that.isTargetDevice(name) && !that.foundDevices[device.deviceId]) {
          that.foundDevices[device.deviceId] = { deviceId: device.deviceId, name: name, RSSI: device.RSSI };
          var list = [];
          var keys = Object.keys(that.foundDevices);
          for (var j = 0; j < keys.length; j++) {
            list.push(that.foundDevices[keys[j]]);
          }
          that.setData({ devices: list });
        }
      }
    });
  },

  isTargetDevice: function (name) {
    for (var i = 0; i < DEVICE_NAME_KEYWORDS.length; i++) {
      if (name.indexOf(DEVICE_NAME_KEYWORDS[i]) !== -1) return true;
    }
    return false;
  },

  stopScan: function () {
    wx.stopBluetoothDevicesDiscovery({});
    if (this.scanTimer) {
      clearTimeout(this.scanTimer);
      this.scanTimer = null;
    }
  },

  connectDevice: function (e) {
    var deviceId = e.currentTarget.dataset.id;
    var deviceName = e.currentTarget.dataset.name || '';
    var that = this;
    this.stopScan();
    this.setData({ status: 'connecting', statusText: '连接中...' });

    wx.createBLEConnection({
      deviceId: deviceId,
      success: function () {
        that.setData({ connectedDeviceId: deviceId });
        that.verifyServices(deviceId, deviceName);
      },
      fail: function () {
        that.setData({ status: 'error', statusText: '连接失败，请重试' });
      }
    });
  },

  verifyServices: function (deviceId, deviceName) {
    var that = this;
    wx.getBLEDeviceServices({
      deviceId: deviceId,
      success: function (res) {
        var services = res.services || [];
        var hasService = false;
        for (var i = 0; i < services.length; i++) {
          var uuid = services[i].uuid.toUpperCase();
          if (uuid.indexOf('6E400001') !== -1) {
            hasService = true;
            that.verifyCharacteristics(deviceId, services[i].uuid, deviceName);
            return;
          }
        }
        that.setData({ status: 'error', statusText: '非支持的设备' });
        wx.closeBLEConnection({ deviceId: deviceId });
      },
      fail: function () {
        that.setData({ status: 'error', statusText: '服务发现失败' });
      }
    });
  },

  verifyCharacteristics: function (deviceId, serviceId, deviceName) {
    var that = this;
    wx.getBLEDeviceCharacteristics({
      deviceId: deviceId,
      serviceId: serviceId,
      success: function (res) {
        var chars = res.characteristics || [];
        var hasWrite = false;
        var hasNotify = false;
        for (var i = 0; i < chars.length; i++) {
          var uuid = chars[i].uuid.toUpperCase();
          if (uuid.indexOf(bleProtocol.WRITE_CHARACTERISTIC_FRAGMENT) !== -1) hasWrite = true;
          if (uuid.indexOf(bleProtocol.NOTIFY_CHARACTERISTIC_FRAGMENT) !== -1) hasNotify = true;
        }
        if (hasWrite && hasNotify) {
          that.onVerified(deviceId, deviceName);
        } else {
          that.setData({ status: 'error', statusText: '设备特征不匹配' });
          wx.closeBLEConnection({ deviceId: deviceId });
        }
      },
      fail: function () {
        that.setData({ status: 'error', statusText: '特征发现失败' });
      }
    });
  },

  onVerified: function (deviceId, deviceName) {
    var that = this;
    this.setData({ status: 'binding', statusText: '正在绑定...' });

    binding.autoBind(deviceName, deviceId).then(function () {
      var app = typeof getApp === 'function' ? getApp() : null;
      if (app && app.restoreDeviceStatus) app.restoreDeviceStatus();

      that.setData({ status: 'connected', statusText: '连接成功', connectedDeviceName: deviceName });
      wx.showToast({ title: '连接成功', icon: 'success' });

      setTimeout(function () {
        wx.navigateBack();
      }, 1500);
    }).catch(function (err) {
      that.setData({ status: 'error', statusText: err.message || '绑定失败' });
    });
  },

  retry: function () {
    this.setData({ status: 'idle', statusText: '点击下方按钮开始扫描', devices: [], connectedDeviceId: '', connectedDeviceName: '' });
  }
});
