// pages/release/project-done.js
Page({
  data: { projectName: '', deliveryDate: '', version: '' },
  onLoad: function (options) {
    this.setData({
      projectName: decodeURIComponent(options.name || ''),
      deliveryDate: decodeURIComponent(options.date || ''),
      version: decodeURIComponent(options.ver || '')
    });
  }
});
