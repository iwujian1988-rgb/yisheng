const tutorialCatalog = require('../../services/tutorials/catalog');

Page({
  data: {
    title: '',
    steps: [],
    notices: []
  },

  onLoad(options) {
    tutorialCatalog.getTutorialDetail(options.id || '')
      .then((detail) => {
        this.setData({
          title: options.title || detail.title,
          steps: detail.steps,
          notices: detail.notices
        });
      });
  }
});
