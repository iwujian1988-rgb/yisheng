const paidUsers = require('../../services/admin/paid-users');

Page({
  data: {
    keyword: '',
    users: [],
    isLoading: false
  },

  onLoad() {
    this.refreshUsers();
  },

  onShow() {
    this.refreshUsers();
  },

  refreshUsers() {
    this.setData({ isLoading: true });
    paidUsers.searchPaidUsers(this.data.keyword)
      .then((users) => {
        this.setData({ users, isLoading: false });
      })
      .catch((err) => {
        this.setData({ users: [], isLoading: false });
        wx.showToast({ title: err.message || '用户读取失败', icon: 'none' });
      });
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value }, this.refreshUsers);
  },

  goCreate() {
    wx.navigateTo({ url: '/pages/admin/paid-user-create' });
  }
});
