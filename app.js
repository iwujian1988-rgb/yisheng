const authSession = require('./services/auth/session');
const deviceSession = require('./services/device/session');

var _envInfo = wx.getAccountInfoSync();
var _isDev = _envInfo.miniProgram.envVersion === 'develop';

App({
  globalData: {
    userInfo: null,
    token: '',
    deviceId: null,
    deviceConnected: false,
    deviceSessionToken: '',
    deviceSessionExpiresAt: '',
    skipBluetoothForDev: _isDev,
    enableMediaMockForDev: false,
    // LAN backend for WeChat real-device debugging.
    baseUrl: 'http://192.168.3.84:8080'
  },

  onLaunch() {
    this.restoreSession();
    this.restoreDeviceStatus();
  },

  restoreSession() {
    const session = authSession.getStoredSessionSummary();
    this.globalData.token = session.token || '';
    this.globalData.userInfo = session.user || null;
  },

  restoreDeviceStatus() {
    const boundDevice = wx.getStorageSync('boundDevice');
    const session = deviceSession.getDeviceSession();
    this.globalData.deviceSessionToken = session && session.token ? session.token : '';
    this.globalData.deviceSessionExpiresAt = session && session.expiresAt ? session.expiresAt : '';
    if (boundDevice && boundDevice.id) {
      this.globalData.deviceId = boundDevice.id;
      this.globalData.deviceConnected = true;
      return;
    }

    this.globalData.deviceId = null;
    this.globalData.deviceConnected = false;
    this.globalData.deviceSessionToken = '';
    this.globalData.deviceSessionExpiresAt = '';
  },

  syncSession(profile) {
    this.globalData.token = profile.token || '';
    this.globalData.userInfo = profile.user || null;
    this.restoreDeviceStatus();
  },

  logout() {
    authSession.clearSession();
    this.globalData.token = '';
    this.globalData.userInfo = null;
    this.globalData.deviceId = null;
    this.globalData.deviceConnected = false;
    this.globalData.deviceSessionToken = '';
    this.globalData.deviceSessionExpiresAt = '';
    wx.reLaunch({ url: '/pages/login/login' });
  }
});
