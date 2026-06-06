Page({
  goSection(e) {
    const section = e.currentTarget.dataset.section || '';
    wx.navigateTo({
      url: '/pages/manual/detail?type=' + encodeURIComponent(section)
    });
  }
});
