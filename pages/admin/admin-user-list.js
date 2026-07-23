const adminUsers = require('../../services/admin/admin-users');

Page({
  data: {
    keyword: '',
    items: [],
    isLoading: false
  },

  onLoad() {
    this.refresh();
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    this.setData({ isLoading: true });
    adminUsers.listAdminUsers(this.data.keyword)
      .then((items) => {
        this.setData({ items, isLoading: false });
      })
      .catch((err) => {
        this.setData({ items: [], isLoading: false });
        wx.showToast({ title: err.message || '加载失败', icon: 'none' });
      });
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value }, this.refresh);
  },

  goCreate() {
    wx.navigateTo({ url: '/pages/admin/admin-user-edit' });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/admin/admin-user-edit?id=' + encodeURIComponent(id) });
  }
});
