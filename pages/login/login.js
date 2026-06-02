// pages/login/login.js
const app = getApp();

Page({
  data: {
    account: '', // 账号/手机号
    password: '', // 密码
    showPassword: false, // 是否显示密码
    agreed: true, // 是否同意协议
    canLogin: false, // 是否可以登录
    isLoading: false, // 登录加载状态
    remainingAttempts: 5 // 剩余尝试次数
  },

  onLoad(options) {
    // 检查是否已登录
    if (app.globalData.token) {
      wx.reLaunch({
        url: '/pages/home/home'
      });
    }

    // 记录登录失败次数
    const failCount = wx.getStorageSync('loginFailCount') || 0;
    if (failCount >= 5) {
      const lockTime = wx.getStorageSync('loginLockTime');
      const now = Date.now();
      if (lockTime && now - lockTime < 30 * 60 * 1000) {
        // 账号已锁定
        const remainingMinutes = Math.ceil((lockTime + 30 * 60 * 1000 - now) / 60000);
        this.showLockDialog(remainingMinutes);
      } else {
        // 锁定时间已过，重置
        wx.removeStorageSync('loginFailCount');
        wx.removeStorageSync('loginLockTime');
      }
    }
  },

  // 账号输入
  onAccountInput(e) {
    this.setData({
      account: e.detail.value.trim()
    }, this.checkCanLogin);
  },

  // 密码输入
  onPasswordInput(e) {
    this.setData({
      password: e.detail.value
    }, this.checkCanLogin);
  },

  // 检查是否可以登录
  checkCanLogin() {
    const { account, password } = this.data;
    const canLogin = account.length > 0 && password.length >= 6;
    this.setData({ canLogin });
  },

  // 切换密码显示
  togglePassword() {
    this.setData({
      showPassword: !this.data.showPassword
    });
  },

  // 协议勾选变化
  onAgreementChange(e) {
    this.setData({
      agreed: e.detail.value.length > 0,
      canLogin: e.detail.value.length > 0 && this.data.account && this.data.password.length >= 6
    });
  },

  // 登录
  onLogin() {
    const { account, password, agreed, canLogin, isLoading } = this.data;

    if (!canLogin || isLoading) return;

    if (!agreed) {
      wx.showToast({
        title: '请先同意用户协议和隐私政策',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 表单验证
    if (!this.validateForm()) return;

    this.setData({ isLoading: true });

    // 调用登录接口
    this.doLogin(account, password);
  },

  // 表单验证
  validateForm() {
    const { account, password } = this.data;

    // 验证手机号/账号
    if (!account) {
      wx.showToast({
        title: '请输入手机号或账号',
        icon: 'none'
      });
      return false;
    }

    // 验证密码
    if (!password) {
      wx.showToast({
        title: '请输入密码',
        icon: 'none'
      });
      return false;
    }

    if (password.length < 6 || password.length > 20) {
      wx.showToast({
        title: '密码长度为6-20位',
        icon: 'none'
      });
      return false;
    }

    // 检查账号锁定状态
    const failCount = wx.getStorageSync('loginFailCount') || 0;
    if (failCount >= 5) {
      const lockTime = wx.getStorageSync('loginLockTime');
      const now = Date.now();
      if (lockTime && now - lockTime < 30 * 60 * 1000) {
        const remainingMinutes = Math.ceil((lockTime + 30 * 60 * 1000 - now) / 60000);
        this.showLockDialog(remainingMinutes);
        return false;
      }
    }

    return true;
  },

  // 执行登录请求
  doLogin(account, password) {
    app.request({
      url: '/api/user/login',
      method: 'POST',
      data: {
        account,
        password
      },
      success: (res) => {
        // 登录成功
        this.handleLoginSuccess(res.data);
      },
      fail: (err) => {
        // 登录失败处理
        this.handleLoginFail(err);
      }
    });
  },

  // 登录成功处理
  handleLoginSuccess(data) {
    const { token, userInfo } = data;

    // 保存token
    wx.setStorageSync('token', token);
    app.globalData.token = token;

    // 保存用户信息
    wx.setStorageSync('userInfo', userInfo);
    app.globalData.userInfo = userInfo;

    // 清除登录失败记录
    wx.removeStorageSync('loginFailCount');
    wx.removeStorageSync('loginLockTime');

    this.setData({ isLoading: false });

    wx.showToast({
      title: '登录成功',
      icon: 'success',
      duration: 1500
    });

    // 跳转到首页
    setTimeout(() => {
      wx.reLaunch({
        url: '/pages/home/home'
      });
    }, 1500);
  },

  // 登录失败处理
  handleLoginFail(err) {
    this.setData({ isLoading: false });

    // 记录失败次数
    let failCount = wx.getStorageSync('loginFailCount') || 0;
    failCount++;
    wx.setStorageSync('loginFailCount', failCount);

    const remainingAttempts = 5 - failCount;

    if (err.errMsg.includes('账号不存在')) {
      wx.showToast({
        title: '账号不存在，请先注册',
        icon: 'none',
        duration: 2000
      });
    } else if (err.errMsg.includes('密码错误')) {
      if (failCount >= 5) {
        // 锁定账号
        wx.setStorageSync('loginLockTime', Date.now());
        wx.showToast({
          title: '密码错误次数过多，账号已被锁定30分钟',
          icon: 'none',
          duration: 3000
        });
      } else {
        wx.showToast({
          title: `密码错误，还剩${remainingAttempts}次尝试机会`,
          icon: 'none',
          duration: 2000
        });
      }
    } else {
      wx.showToast({
        title: err.errMsg || '登录失败，请稍后重试',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 显示账号锁定对话框
  showLockDialog(minutes) {
    wx.showModal({
      title: '账号已锁定',
      content: `密码错误次数过多，账号已被锁定，请${minutes}分钟后再试或联系客服`,
      confirmText: '联系客服',
      cancelText: '我知道了',
      success: (res) => {
        if (res.confirm) {
          // 跳转到客服
          wx.navigateTo({
            url: '/pages/profile/customer-service'
          });
        }
      }
    });
  },

  // 微信一键登录
  onWechatLogin(e) {
    const { agreed } = this.data;

    if (!agreed) {
      wx.showToast({
        title: '请先同意用户协议和隐私政策',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    if (e.detail.errMsg === 'getUserInfo:ok') {
      const { userInfo } = e.detail;
      this.doWechatLogin(userInfo);
    }
  },

  // 微信登录请求
  doWechatLogin(userInfo) {
    wx.showLoading({ title: '登录中...' });

    // 先获取code
    wx.login({
      success: (res) => {
        if (res.code) {
          // 调用后端接口
          app.request({
            url: '/api/user/wechat-login',
            method: 'POST',
            data: {
              code: res.code,
              userInfo: userInfo
            },
            success: (data) => {
              wx.hideLoading();
              this.handleLoginSuccess(data);
            },
            fail: (err) => {
              wx.hideLoading();
              wx.showToast({
                title: '登录失败，请重试',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  },

  // 跳转到注册页
  goToRegister() {
    wx.navigateTo({
      url: '/pages/register/register'
    });
  },

  // 跳转到忘记密码页
  goToForgetPwd() {
    wx.navigateTo({
      url: '/pages/forget-password/forget-password'
    });
  },

  // 查看协议
  goToAgreement(e) {
    const type = e.currentTarget.dataset.type;
    wx.navigateTo({
      url: `/pages/common/agreement?type=${type}`
    });
  }
});
