// pages/release/version-detail.js
Page({
  data: { versionName: '', releaseDate: '', status: '', changelog: '' },
  onLoad: function (options) {
    this.setData({
      versionName: decodeURIComponent(options.name || ''),
      releaseDate: decodeURIComponent(options.date || ''),
      status: decodeURIComponent(options.status || ''),
      changelog: decodeURIComponent(options.log || '')
    });
  },
  goRollback: function () { wx.navigateTo({ url: '/pages/release/rollback-confirm' }); }
});
