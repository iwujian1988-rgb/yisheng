const authSession = require('./services/auth/session');
const deviceSession = require('./services/device/session');
const apiBase = require('./services/config/api-base');
const bleLink = require('./services/device/ble-link');
const liveHeartbeat = require('./services/device/live-heartbeat');
const transferDemo = require('./services/device/transfer-demo');

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
    // 生产环境：替换为你的 HTTPS 域名（微信公众平台 request 合法域名要与此一致）
    // 开发/真机调试：可临时改回 'http://127.0.0.1:8080'，并配置下面的 lanBaseHost
    baseUrl: 'https://api.maxnote.me',
    // 仅真机调试时使用：改成你电脑在当前 WiFi 下的局域网 IP（ipconfig 查看）
    lanBaseHost: '',
    resolvedBaseUrl: ''
  },

  onLaunch() {
    // getApp() is not reliable during App.onLaunch in DevTools, so retain this instance's configured URL.
    const resolved = apiBase.applyResolvedBaseUrl() || this.globalData.baseUrl;
    this.globalData.resolvedBaseUrl = resolved;
    console.log('[app] api base url:', resolved);
    if (!apiBase.isDevtoolsEnvironment() && apiBase.usesLocalhost(this.globalData.baseUrl) && !this.globalData.lanBaseHost) {
      console.warn('[app] 真机调试请配置 globalData.lanBaseHost');
    }
    const session = authSession.getStoredSessionSummary();
    this.restoreSession();
    this.restoreDeviceStatus();
    transferDemo.applySessionFeatures(session.features);
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
    const previousBleDeviceId = this.globalData.bleDeviceId || '';
    const previousBleLinkReady = Boolean(this.globalData.bleLinkReady && previousBleDeviceId);
    this.globalData.token = profile.token || '';
    this.globalData.userInfo = profile.user || null;
    this.restoreDeviceStatus();
    if (previousBleLinkReady) {
      this.globalData.bleDeviceId = previousBleDeviceId;
      bleLink.markBleLinkReady(previousBleDeviceId);
    }
    transferDemo.applySessionFeatures(profile.features);
  },

  logout() {
    authSession.clearSession();
    liveHeartbeat.stop();
    this.globalData.token = '';
    this.globalData.userInfo = null;
    this.globalData.deviceId = null;
    this.globalData.deviceConnected = false;
    this.globalData.bleDeviceId = '';
    this.globalData.bleDeviceName = '';
    this.globalData.bleLinkReady = false;
    this.globalData.transferDemoActive = false;
    this.globalData.deviceSessionToken = '';
    this.globalData.deviceSessionExpiresAt = '';
    wx.reLaunch({ url: '/pages/login/login' });
  }
});
