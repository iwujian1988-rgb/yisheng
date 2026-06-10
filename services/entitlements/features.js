function isBluetoothConnected() {
  var app = typeof getApp === 'function' ? getApp() : null;
  var gd = app && app.globalData;
  return Boolean(gd && (gd.skipBluetoothForDev || gd.deviceConnected));
}

function guardAiFeature(featureKey, featureName) {
  if (!isBluetoothConnected()) {
    wx.showModal({
      title: '先连接设备',
      content: '使用' + (featureName || '该功能') + '需要先连接蓝牙设备。',
      confirmText: '去连接',
      cancelText: '稍后',
      success: function (res) {
        if (res.confirm) wx.navigateTo({ url: '/pages/home/home' });
      }
    });
    return false;
  }
  if (wx.getStorageSync('purchaseStatus') !== 'paid') {
    wx.showModal({
      title: '需开通传输服务',
      content: (featureName || '该功能') + '需要开通服务后使用。',
      confirmText: '去开通',
      cancelText: '稍后',
      success: function (res) {
        if (res.confirm) wx.navigateTo({ url: '/pages/purchase/index' });
      }
    });
    return false;
  }
  return true;
}

module.exports = {
  guardAiFeature: guardAiFeature,
  isBluetoothConnected: isBluetoothConnected
};
