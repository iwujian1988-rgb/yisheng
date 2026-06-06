Page({
  data: {
    currentStep: 0
  },

  onLoad(options) {
    const currentStep = parseInt(options.currentStep, 10);
    this.setData({
      currentStep: Number.isNaN(currentStep) ? 0 : Math.max(0, Math.min(2, currentStep))
    });
  },

  nextStep() {
    const next = this.data.currentStep + 1;
    if (next <= 2) {
      this.setData({ currentStep: next });
      return;
    }
    this.startUsing();
  },

  startUsing() {
    wx.redirectTo({ url: '/pages/login/login' });
  },

  skip() {
    wx.reLaunch({ url: '/pages/home/home' });
  }
});
