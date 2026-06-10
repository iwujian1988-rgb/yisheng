const HOME_BANNER = {
  title: '使用前看一眼',
  subtitle: '电脑输入框、设备连接、常见问题都在这里',
  url: 'https://mp.weixin.qq.com/'
};

function getHomeBanner() {
  const stored = wx.getStorageSync('homeBanner');
  if (stored && stored.url) {
    return Object.assign({}, HOME_BANNER, stored);
  }
  return HOME_BANNER;
}

module.exports = {
  getHomeBanner
};
