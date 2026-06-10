Page({
  data: {
    bleCheck: 'pending',
    deviceCheck: 'pending',
    securityCheck: 'pending',
    complianceCheck: 'pending',
    uxCheck: 'pending'
  },

  onLoad() {
    const saved = wx.getStorageSync('releaseFinalAcceptance') || {};
    this.setData({
      bleCheck: saved.bleCheck || 'pending',
      deviceCheck: saved.deviceCheck || 'pending',
      securityCheck: saved.securityCheck || 'pending',
      complianceCheck: saved.complianceCheck || 'pending',
      uxCheck: saved.uxCheck || 'pending'
    });
  },

  confirmAcceptance() {
    const result = {
      bleCheck: 'passed',
      deviceCheck: 'passed',
      securityCheck: 'passed',
      complianceCheck: 'passed',
      uxCheck: 'passed',
      acceptedAt: Date.now()
    };
    wx.setStorageSync('releaseFinalAcceptance', result);
    this.setData(result);
    wx.showToast({ title: '已验收', icon: 'success' });
  }
});
