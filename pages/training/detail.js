// pages/training/detail.js
Page({
  data: { courseTitle: '', courseDesc: '', courseContent: '' },
  onLoad: function (options) {
    this.setData({
      courseTitle: decodeURIComponent(options.title || ''),
      courseDesc: decodeURIComponent(options.desc || ''),
      courseContent: decodeURIComponent(options.content || '')
    });
  },
  goDone: function () { wx.navigateTo({ url: '/pages/training/done' }); }
});
