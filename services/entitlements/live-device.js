var protocol = require('../../utils/ble/protocol');

function hasLiveBluetoothConnection() {
  return new Promise(function (resolve) {
    if (typeof wx === 'undefined' || !wx.getConnectedBluetoothDevices) {
      resolve(false);
      return;
    }
    wx.getConnectedBluetoothDevices({
      services: [protocol.SERVICE_ID],
      success: function (res) {
        resolve(Boolean(res && res.devices && res.devices.length > 0));
      },
      fail: function () {
        resolve(false);
      }
    });
  });
}

function hasLiveAuthorizedDevice() {
  return hasLiveBluetoothConnection().then(function (connected) {
    if (!connected) return false;
    var app = typeof getApp === 'function' ? getApp() : null;
    var gd = app && app.globalData;
    var boundBleDeviceId = gd && gd.bleDeviceId;
    var boundDevice = wx.getStorageSync('boundDevice');
    if (!boundBleDeviceId && !(boundDevice && boundDevice.bleDeviceId)) {
      return false;
    }
    return true;
  });
}

module.exports = {
  hasLiveBluetoothConnection: hasLiveBluetoothConnection,
  hasLiveAuthorizedDevice: hasLiveAuthorizedDevice
};
