// app.js
App({
  globalData: {
    userInfo: null,
    token: '',
    deviceId: null,
    deviceConnected: false,
    baseUrl: 'https://api.example.com' // 替换为实际API地址
  },

  onLaunch() {
    // 检查登录状态
    this.checkLoginStatus();

    // 检查设备连接状态
    this.checkDeviceStatus();
  },

  // 检查登录状态
  checkLoginStatus() {
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.token = token;
      // 获取用户信息
      this.getUserInfo();
    }
  },

  // 获取用户信息
  getUserInfo() {
    // TODO: 调用API获取用户信息
  },

  // 检查设备连接状态
  checkDeviceStatus() {
    const deviceId = wx.getStorageSync('deviceId');
    if (deviceId) {
      this.globalData.deviceId = deviceId;
      this.globalData.deviceConnected = true;
    }
  },

  // API请求封装
  request(options) {
    const { url, method = 'GET', data = {}, success, fail } = options;

    wx.request({
      url: this.globalData.baseUrl + url,
      method,
      header: {
        'Content-Type': 'application/json',
        'Authorization': this.globalData.token
      },
      data,
      success: (res) => {
        if (res.statusCode === 200) {
          success && success(res.data);
        } else {
          this.handleApiError(res);
        }
      },
      fail: (err) => {
        fail && fail(err);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
      }
    });
  },

  // 处理API错误
  handleApiError(res) {
    switch (res.statusCode) {
      case 401:
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        // 跳转到登录页
        setTimeout(() => {
          wx.reLaunch({
            url: '/pages/login/login'
          });
        }, 1500);
        break;
      case 403:
        wx.showToast({
          title: '无权限访问',
          icon: 'none'
        });
        break;
      default:
        wx.showToast({
          title: res.data.message || '请求失败',
          icon: 'none'
        });
    }
  }
});
