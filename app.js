const authSession = require('./services/auth/session');

App({
  globalData: {
    userInfo: null,
    token: '',
    deviceId: null,
    deviceConnected: false,
    // Empty baseUrl means local test mode. Set a real backend URL only when API is ready.
    baseUrl: ''
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
    if (boundDevice && boundDevice.id) {
      this.globalData.deviceId = boundDevice.id;
      this.globalData.deviceConnected = true;
      return;
    }

    this.globalData.deviceId = null;
    this.globalData.deviceConnected = false;
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
    wx.reLaunch({ url: '/pages/login/login' });
  }
});
