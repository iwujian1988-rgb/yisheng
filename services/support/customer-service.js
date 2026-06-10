function getCustomerServiceConfig() {
  return wx.getStorageSync('customerServiceConfig') || {};
}

function openCustomerService(options) {
  const config = Object.assign({}, getCustomerServiceConfig(), options || {});
  if (wx.openCustomerServiceChat && config.extInfoUrl && config.corpId) {
    wx.openCustomerServiceChat({
      extInfo: { url: config.extInfoUrl },
      corpId: config.corpId,
      showMessageCard: true,
      sendMessageTitle: config.title || '咨询开通服务',
      sendMessagePath: config.path || '/pages/profile/profile',
      fail() {
        wx.navigateTo({ url: '/pages/support/index?type=customer_service' });
      }
    });
    return;
  }
  wx.navigateTo({ url: '/pages/support/index?type=customer_service' });
}

module.exports = {
  openCustomerService
};
