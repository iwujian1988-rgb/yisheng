const tutorialCatalog = require('../../services/tutorials/catalog');

Page({
  data: {
    steps: []
  },

  onLoad() {
    tutorialCatalog.getConnectGuide()
      .then((guide) => {
        this.setData({ steps: guide.steps || [] });
      });
  },

  goToFaq() {
    wx.navigateTo({ url: '/pages/help/help' });
  }
});
