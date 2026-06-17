const authSession = require('./services/auth/session');
const deviceSession = require('./services/device/session');
const apiBase = require('./services/config/api-base');
const bleLink = require('./services/device/ble-link');

var _envInfo = wx.getAccountInfoSync();
var _isDev = _envInfo.miniProgram.envVersion === 'develop';

App({
  globalData: {
    userInfo: null,
    token: '',
    deviceId: null,
    deviceConnected: false,
    bleDeviceId: '',
    bleDeviceName: '',
    bleLinkReady: false,
    deviceSessionToken: '',
    deviceSessionExpiresAt: '',
    // 模拟器地址；真机调试时会自动换成 lanBaseHost
    baseUrl: 'http://127.0.0.1:8080',
    // 真机调试必填：改成你电脑在当前 WiFi 下的局域网 IP（ipconfig 查看）
    lanBaseHost: '192.168.50.194',
    resolvedBaseUrl: ''
  },

  onLaunch() {
    apiBase.applyResolvedBaseUrl();
    const resolved = this.globalData.resolvedBaseUrl || apiBase.resolveApiBaseUrl();
    console.log('[app] api base url:', resolved);
    if (!apiBase.isDevtoolsEnvironment() && apiBase.usesLocalhost(this.globalData.baseUrl) && !this.globalData.lanBaseHost) {
      console.warn('[app] 真机调试请配置 globalData.lanBaseHost');
    }
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
      this.globalData.bleDeviceId = bleLink.getStoredBleDeviceId();
      this.globalData.bleLinkReady = false;
      return;
    }

    this.globalData.deviceId = null;
    this.globalData.deviceConnected = false;
    this.globalData.bleDeviceId = '';
    this.globalData.bleDeviceName = '';
    this.globalData.bleLinkReady = false;
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
