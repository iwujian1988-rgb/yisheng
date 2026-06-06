const profileAccount = require('../../services/profile/account');

Page({
  data: {
    nickname: '',
    phone: '',
    canSave: false
  },

  onLoad(options) {
    profileAccount.getProfile()
      .then((profile) => {
        const user = profile || {};
        this.setData({
          nickname: options.nickname || user.nickname || '',
          phone: options.phone || user.phone || '',
          canSave: Boolean(options.nickname || user.nickname)
        });
      });
  },

  onNicknameInput(e) {
    const nickname = e.detail.value.trim();
    this.setData({ nickname, canSave: nickname.length > 0 });
  },

  saveProfile() {
    if (!this.data.nickname) return;
    profileAccount.saveProfile({
      nickname: this.data.nickname
    }).then(() => {
      wx.showToast({ title: '已保存', icon: 'success' });
      wx.navigateBack();
    }).catch((err) => {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    });
  }
});
