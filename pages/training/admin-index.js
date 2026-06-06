// pages/training/admin-index.js
Page({
  data: { courses: [] },
  onLoad: function () {},
  goDetail: function (e) { wx.navigateTo({ url: '/pages/training/detail?id=' + e.currentTarget.dataset.id }); }
});
