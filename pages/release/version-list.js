// pages/release/version-list.js
Page({
  data: { versions: [] },
  onLoad: function () {},
  goDetail: function (e) { wx.navigateTo({ url: '/pages/release/version-detail?id=' + e.currentTarget.dataset.id }); }
});
