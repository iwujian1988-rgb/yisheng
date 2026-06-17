// 已废弃：保留页面注册，访问时直接跳转首页
Page({
  onLoad() {
    wx.reLaunch({ url: '/pages/home/home' });
  }
});
