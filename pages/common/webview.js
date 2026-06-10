Page({
  data: {
    url: ''
  },

  onLoad(options) {
    const title = options && options.title ? decodeURIComponent(options.title) : '详情';
    const url = options && options.url ? decodeURIComponent(options.url) : '';
    if (title) {
      wx.setNavigationBarTitle({ title });
    }
    this.setData({ url });
  }
});
