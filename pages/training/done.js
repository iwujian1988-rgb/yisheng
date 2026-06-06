// pages/training/done.js
Page({
  data: { courseTitle: '', doneTime: '' },
  onLoad: function (options) {
    this.setData({ courseTitle: decodeURIComponent(options.title || ''), doneTime: '--' });
  },
  goFeedback: function () { wx.navigateTo({ url: '/pages/training/feedback' }); },
  goBack: function () { wx.navigateBack({ delta: 2 }); }
});
