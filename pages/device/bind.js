const deviceBinding = require('../../services/device/binding');

Page({
  data: {
    serialNo: '',
    verifyCode: '',
    serialNoError: '',
    verifyCodeError: '',
    canBind: false,
    isLoading: false
  },

  onSerialNoInput(e) {
    this.setData({ serialNo: (e.detail.value || '').trim(), serialNoError: '' }, this.checkForm);
  },

  onVerifyCodeInput(e) {
    this.setData({ verifyCode: (e.detail.value || '').trim(), verifyCodeError: '' }, this.checkForm);
  },

  checkForm() {
    this.setData({ canBind: Boolean(this.data.serialNo && this.data.verifyCode) });
  },

  bindDevice() {
    if (this.data.isLoading) return;
    if (!this.data.serialNo) {
      this.setData({ serialNoError: '请输入设备序列号' });
      return;
    }
    if (!this.data.verifyCode) {
      this.setData({ verifyCodeError: '请输入校验码' });
      return;
    }

    this.setData({ isLoading: true });
    deviceBinding.bindDevice(this.data.serialNo, this.data.verifyCode)
      .then(() => {
        const app = typeof getApp === 'function' ? getApp() : null;
        if (app && app.restoreDeviceStatus) app.restoreDeviceStatus();
        this.setData({ isLoading: false });
        wx.showToast({ title: '绑定成功', icon: 'success' });
        wx.reLaunch({ url: '/pages/home/home' });
      })
      .catch((err) => {
        this.setData({ isLoading: false });
        wx.showToast({ title: err.message || '绑定失败', icon: 'none' });
      });
  }
});
